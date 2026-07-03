import ContactLegacy from './ContactLegacy';
import ContactDynamic from './ContactDynamic';

const useDynamicIntake = import.meta.env.VITE_DYNAMIC_INTAKE === 'true';

function Contact() {
  if (useDynamicIntake) {
    return <ContactDynamic />;
  }
  return <ContactLegacy />;
}

export default Contact;
