document.addEventListener('DOMContentLoaded', () => {
  if (typeof bbInitSimpleServicePage === 'function') {
    bbInitSimpleServicePage({ serviceId: 'photography', title: 'Customize Photography', shortTitle: 'Photography' });
  }
});
