document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbInitSimpleServicePage === 'function') {
    bbInitSimpleServicePage({ serviceId: 'decoration', title: 'Customize Decoration', shortTitle: 'Decoration' });
  }
});
