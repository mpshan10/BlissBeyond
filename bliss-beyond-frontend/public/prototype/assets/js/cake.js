document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbInitSimpleServicePage === 'function') {
    bbInitSimpleServicePage({ serviceId: 'cake', title: 'Customize Cake & Desserts', shortTitle: 'Cake' });
  }
});
