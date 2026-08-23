document.addEventListener('DOMContentLoaded', () => {

  if (typeof bbInitSimpleServicePage === 'function') {
    bbInitSimpleServicePage({
      serviceId: 'lighting-av',
      title: 'Customize Sound, Lighting & AV',
      shortTitle: 'Sound, Lighting & AV'
    });
  }

  const packageRadios = document.querySelectorAll('.package-radio');
  const packageCards = document.querySelectorAll('.av-package');
  const allPriceInputs = document.querySelectorAll('[data-price-input]');

  /* =====================================
     RESTORE SAVED OPTIONS
  ===================================== */

  const savedServices =
    typeof bbGetServiceData === 'function'
      ? bbGetServiceData()
      : {};

  const savedLighting =
    savedServices['lighting-av'];

  if (
    savedLighting &&
    Array.isArray(savedLighting.options)
  ) {

    allPriceInputs.forEach((input) => {

      const label =
        input.dataset.label ||
        input.value ||
        input.name;

      if (savedLighting.options.includes(label)) {

        if (
          input.type === 'checkbox' ||
          input.type === 'radio'
        ) {
          input.checked = true;
        }

      }

    });

  }


  /* =====================================
     PACKAGE CARD VISUAL SELECTION
  ===================================== */

  function updateSelectedPackageCard() {

    packageCards.forEach((card) => {
      card.classList.remove('selected');
    });

    const selectedRadio =
      document.querySelector('.package-radio:checked');

    if (!selectedRadio) return;

    const selectedCard =
      selectedRadio.closest('.av-package');

    if (selectedCard) {
      selectedCard.classList.add('selected');
    }

  }


  packageRadios.forEach((radio) => {

    radio.addEventListener('change', () => {
      updateSelectedPackageCard();
    });

  });


  /* =====================================
     CLICK WHOLE PACKAGE CARD
  ===================================== */

  packageCards.forEach((card) => {

    card.addEventListener('click', (event) => {

      if (event.target.matches('input')) {
        return;
      }

      const radio =
        card.querySelector('.package-radio');

      if (!radio) return;

      radio.checked = true;

      radio.dispatchEvent(
        new Event('change', {
          bubbles: true
        })
      );

    });

  });


  /* =====================================
     UPDATE PAGE AFTER RESTORE
  ===================================== */

  updateSelectedPackageCard();


  /*
    Trigger change once after restoring.
    This makes bbInitSimpleServicePage()
    recalculate the estimate and summary.
  */

  const restoredInput =
    document.querySelector(
      '[data-price-input]:checked'
    );

  if (restoredInput) {

    restoredInput.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );

  }

});