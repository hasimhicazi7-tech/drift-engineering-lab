/* ============================================================
   مختبر الدريفت الهندسي — simulator.js
   Drift Engineering Lab — Interactive Core
   ============================================================
   البنية: ثلاث وحدات مستقلة + Bootstrap
   1. DiffSimulator     — محاكي الدفرنس الفيزيائي
   2. MobileMenu        — قائمة الموبايل (Hamburger)
   3. NavbarBehavior    — سلوك الـ Navbar عند التمرير
============================================================ */

'use strict';

/* ============================================================
   01. DiffSimulator — محاكي الدفرنس
============================================================ */
const DiffSimulator = (() => {

    // ---- الثوابت الفيزيائية ----
    const PHYSICS = {
        BASE_RPM:         800,      // عدد لفات المحرك في وضع التباطؤ
        MAX_ENGINE_RPM:   7000,     // أعلى عدد لفات للمحرك
        AXLE_RATIO:       3.92,     // نسبة المحور الخلفي
        SLIP_THRESHOLD:   60,       // نسبة الوقود التي يبدأ بعدها فقدان التماسك
        STEERING_FACTOR:  0.025     // معامل تأثير زاوية التوجيه على فرق سرعة العجلات
    };

    // ---- مراجع الـ DOM ----
    let els = null;

    // ---- الحالة (Single Source of Truth) ----
    const state = {
        throttle: 0,
        steering: 0,
        diffType: 'open'
    };

    /**
     * يحسب ديناميكيات العجلتين بناءً على الحالة الحالية.
     * نقي تماماً — لا يقرأ DOM ولا يكتب فيه.
     */
    function calculateWheelDynamics() {
        const { throttle, steering, diffType } = state;

        // سرعة المحرك ← سرعة المحور
        const engineRpm = PHYSICS.BASE_RPM +
            (throttle / 100) * (PHYSICS.MAX_ENGINE_RPM - PHYSICS.BASE_RPM);
        const axleRpm = engineRpm / PHYSICS.AXLE_RATIO;

        let inside, outside, traction;

        // ================== Open Differential ==================
        if (diffType === 'open') {

            if (throttle < PHYSICS.SLIP_THRESHOLD || steering === 0) {
                // قبل العتبة: توزيع طبيعي حسب زاوية التوجيه
                const diffFactor = steering * PHYSICS.STEERING_FACTOR;
                inside  = axleRpm * (1 - diffFactor);
                outside = axleRpm * (1 + diffFactor);
                traction = 'STABLE';
            } else {
                // فوق العتبة + توجيه = الداخلية تنفلت
                const slipIntensity  = (throttle - PHYSICS.SLIP_THRESHOLD) / 40;
                const steeringBoost  = steering / 30;
                const explosionFactor = 1 + (slipIntensity * steeringBoost * 2.5);

                inside  = axleRpm * explosionFactor;
                outside = axleRpm * (1 - slipIntensity * 0.4);
                traction = 'INSIDE WHEEL SPIN';
            }

        // ================== LSD ==================
        } else {

            if (throttle < PHYSICS.SLIP_THRESHOLD || steering === 0) {
                const diffFactor = steering * PHYSICS.STEERING_FACTOR * 0.6;
                inside  = axleRpm * (1 - diffFactor);
                outside = axleRpm * (1 + diffFactor);
                traction = 'STABLE';
            } else {
                // المحور قُفل: كلتا العجلتين بنفس السرعة العالية
                const slipIntensity = (throttle - PHYSICS.SLIP_THRESHOLD) / 40;
                const steeringBoost = steering / 30;
                const driftFactor   = 1 + (slipIntensity * steeringBoost * 1.6);
                const lockedRpm     = axleRpm * driftFactor;

                inside  = lockedRpm;
                outside = lockedRpm;
                traction = 'DRIFT INITIATED';
            }
        }

        return {
            inside:   Math.round(inside),
            outside:  Math.round(outside),
            traction
        };
    }

    /**
     * يطبّق النتائج على الواجهة.
     */
    function render() {
        const { inside, outside, traction } = calculateWheelDynamics();

        // الأرقام
        els.insideRpm.textContent  = inside.toLocaleString('en-US');
        els.outsideRpm.textContent = outside.toLocaleString('en-US');
        els.tractionStatus.textContent = traction;

        // ألوان صندوق الحالة
        els.tractionBox.classList.remove('is-stable', 'is-warning', 'is-danger');
        if (traction === 'STABLE') {
            els.tractionBox.classList.add('is-stable');
        } else if (traction === 'INSIDE WHEEL SPIN') {
            els.tractionBox.classList.add('is-danger');
        } else if (traction === 'DRIFT INITIATED') {
            els.tractionBox.classList.add('is-warning');
        }

        // التأثيرات البصرية على العجلات
        const insideSlipping = traction === 'INSIDE WHEEL SPIN';
        const bothSlipping   = traction === 'DRIFT INITIATED';

        els.insideWheel.classList.toggle('is-slipping',  insideSlipping || bothSlipping);
        els.outsideWheel.classList.toggle('is-slipping', bothSlipping);

        els.skidLeft.classList.toggle('is-active',  insideSlipping || bothSlipping);
        els.skidRight.classList.toggle('is-active', bothSlipping);

        // ميلان السيارة
        const carRotation = state.steering * (bothSlipping ? -0.8 : -0.3);
        els.car.style.transform = `rotate(${carRotation}deg)`;
    }

    function bindEvents() {
        els.throttle.addEventListener('input', e => {
            state.throttle = Number(e.target.value);
            els.throttleValue.textContent = `${state.throttle}%`;
            render();
        });

        els.steering.addEventListener('input', e => {
            state.steering = Number(e.target.value);
            els.steeringValue.textContent = `${state.steering}°`;
            render();
        });

        els.diffType.addEventListener('change', e => {
            state.diffType = e.target.value;
            render();
        });
    }

    function init() {
        // التقاط مراجع الـ DOM
        const sim = document.getElementById('lsd-simulator');
        if (!sim) return; // لا توجد حاوية محاكي في هذه الصفحة

        const tractionEl = document.getElementById('traction-status');

        els = {
            // مدخلات
            throttle:        document.getElementById('throttle'),
            steering:        document.getElementById('steering'),
            diffType:        document.getElementById('diff-type'),

            // قيم العرض
            throttleValue:   document.getElementById('throttle-value'),
            steeringValue:   document.getElementById('steering-value'),

            // الأرقام
            insideRpm:       document.getElementById('inside-rpm'),
            outsideRpm:      document.getElementById('outside-rpm'),
            tractionStatus:  tractionEl,
            tractionBox:     tractionEl ? tractionEl.closest('.sim__readout') : null,

            // العناصر البصرية
            car:             sim.querySelector('.sim__car'),
            insideWheel:     sim.querySelector('[data-wheel="inside"]'),
            outsideWheel:    sim.querySelector('[data-wheel="outside"]'),
            skidLeft:        sim.querySelector('.sim__skid--rl'),
            skidRight:       sim.querySelector('.sim__skid--rr')
        };

        // التحقق من وجود جميع العناصر الحرجة
        const critical = ['throttle', 'steering', 'diffType', 'car'];
        for (const key of critical) {
            if (!els[key]) {
                console.warn(`[DiffSimulator] عنصر مفقود: ${key}`);
                return;
            }
        }

        bindEvents();
        render();
    }

    return { init };
})();


/* ============================================================
   02. MobileMenu — قائمة الموبايل
============================================================ */
const MobileMenu = (() => {

    let toggleBtn, menu, body;
    let isOpen = false;

    function open() {
        menu.classList.add('is-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('aria-label', 'إغلاق القائمة');
        body.classList.add('is-menu-open');
        isOpen = true;
    }

    function close() {
        menu.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'فتح القائمة');
        body.classList.remove('is-menu-open');
        isOpen = false;
    }

    function toggle() {
        isOpen ? close() : open();
    }

    function init() {
        toggleBtn = document.querySelector('.navbar__toggle');
        menu      = document.getElementById('navbar-menu');
        body      = document.body;

        if (!toggleBtn || !menu) return;

        // النقر على الزر
        toggleBtn.addEventListener('click', toggle);

        // إغلاق القائمة عند النقر على أي رابط داخلها
        menu.querySelectorAll('.navbar__link').forEach(link => {
            link.addEventListener('click', () => {
                if (isOpen) close();
            });
        });

        // إغلاق بمفتاح Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && isOpen) close();
        });

        // إغلاق تلقائي عند تكبير الشاشة فوق breakpoint
        const mql = window.matchMedia('(min-width: 769px)');
        mql.addEventListener('change', e => {
            if (e.matches && isOpen) close();
        });
    }

    return { init };
})();


/* ============================================================
   03. NavbarBehavior — تغيير شكل الـ Navbar عند التمرير
============================================================ */
const NavbarBehavior = (() => {

    let header;
    const SCROLL_THRESHOLD = 20;

    function onScroll() {
        const scrolled = window.scrollY > SCROLL_THRESHOLD;
        header.classList.toggle('is-scrolled', scrolled);
    }

    function init() {
        header = document.querySelector('.site-header');
        if (!header) return;

        // استخدام passive لتحسين أداء التمرير
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); // فحص الحالة الأولية
    }

    return { init };
})();


/* ============================================================
   Bootstrap — تهيئة جميع الوحدات بعد تحميل الـ DOM
============================================================ */
function bootstrap() {
    DiffSimulator.init();
    MobileMenu.init();
    NavbarBehavior.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
