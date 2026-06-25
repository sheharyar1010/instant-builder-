/**
 * Multi-Step Form Navigation
 * Handles pagination for Quotemate forms
 */
document.addEventListener('DOMContentLoaded', function () {
    const bootMultiStepForms = () => {
        document.querySelectorAll('.multi-step-form').forEach((form) => {
            if (form.dataset.multiStepBound === '1') return;
            if (form.classList.contains('unified-multi-step-form')) return;
            if (window.quotemateUnifiedSteps) return;

            form.dataset.multiStepBound = '1';
            new MultiStepForm(form);
        });
    };

    // Defer once so unified-form-steps can attach first.
    requestAnimationFrame(() => {
        bootMultiStepForms();
        setTimeout(bootMultiStepForms, 0);
    });
});

class MultiStepForm {
    constructor(form) {
        this.form = form;
        this.steps = Array.from(form.querySelectorAll('.form-step'));
        this.indicators = Array.from(form.querySelectorAll('.step-indicator'));
        this.progressBar = form.querySelector('.progress-fill');
        this.currentStep = 0;

        this.init();
    }

    init() {
        // Bind events
        this.form.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });

        this.form.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', () => this.prevStep());
        });

        // Initialize display
        this.showStep(this.currentStep);
    }

    showStep(index) {
        if (this.form.classList.contains('unified-multi-step-form') || window.quotemateUnifiedSteps) {
            return;
        }

        // Hide all steps
        this.steps.forEach((step, i) => {
            if (i === index) {
                step.style.display = 'block';
            } else {
                step.style.display = 'none';
            }
        });

        // Update indicators
        this.indicators.forEach((indicator, i) => {
            if (i <= index) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update progress bar
        if (this.progressBar) {
            const progress = ((index + 1) / this.steps.length) * 100;
            this.progressBar.style.width = `${progress}%`;
        }

        this.currentStep = index;

        // Scroll to top of form
        const formHeader = this.form.closest('.quotemate-form-wrapper');
        if (formHeader) {
            formHeader.scrollIntoView({ behavior: 'smooth' });
        }
    }

    nextStep() {
        if (this.validateStep(this.currentStep)) {
            // Check for internal navigation first
            const event = new CustomEvent('quotemate-next-step-check', {
                bubbles: true,
                cancelable: true,
                detail: {
                    stepIndex: this.currentStep
                }
            });
            const result = document.dispatchEvent(event);

            if (!result) {
                // Event prevented, meaning internal navigation took place
                return;
            }

            if (this.currentStep < this.steps.length - 1) {
                this.showStep(this.currentStep + 1);
            }
        }
    }

    prevStep() {
        // Check for internal navigation first
        const event = new CustomEvent('quotemate-prev-step-check', {
            bubbles: true,
            cancelable: true,
            detail: {
                stepIndex: this.currentStep
            }
        });
        const result = document.dispatchEvent(event);

        if (!result) {
            // Event prevented, meaning internal navigation took place
            return;
        }

        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    validateStep(index) {
        const step = this.steps[index];
        const requiredInputs = step.querySelectorAll('[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
                // Highlight error
                input.classList.add('is-invalid');

                // Add shake animation
                const formGroup = input.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.add('shake');
                    setTimeout(() => formGroup.classList.remove('shake'), 500);
                }
            } else {
                input.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    validateInput(input) {
        if (input.type === 'radio' || input.type === 'checkbox') {
            const name = input.name;
            const group = this.form.querySelectorAll(`input[name="${name}"]`);
            // Check if at least one is checked
            return Array.from(group).some(r => r.checked);
        }

        /* Special handling for hidden inputs that might be required (like service selector) */
        if (input.type === 'hidden') {
            if (input.value.trim() !== '') return true;
            // If it's a hidden input for a progressive selector, we might check the visible containers?
            // But usually the hidden input holds the value.
            return false;
        }

        return input.value.trim() !== '';
    }
}
