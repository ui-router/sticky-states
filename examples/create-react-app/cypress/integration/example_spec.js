describe('example app', () => {
  it('loads', () => {
    cy.visit('http://localhost:4000');
  });

  it('renders links', () => {
    cy.visit('http://localhost:4000/');
    cy.get('a').contains('home');
    cy.get('a').contains('about');
  });

  it('renders home by default', () => {
    cy.visit('http://localhost:4000/');
    cy.contains('home state loaded');
  });

  it('home state has a textarea', () => {
    cy.visit('http://localhost:4000');
    cy.get('#home textarea');
  });

  it('retains text entered into the textarea in home', () => {
    cy.visit('http://localhost:4000');
    cy.get('#home textarea')
      .type(' The quick brown fox');

    cy.get('a').contains('about').click();
    cy.contains('about state loaded');

    cy.get('a').contains('home').click();
    cy.contains('home state loaded');

    cy.get('#home textarea')
      .should('have.value', 'Text entered here is not lost The quick brown fox');
  });

  it('retains text entered into the textarea in about', () => {
    cy.visit('http://localhost:4000');

    cy.get('a').contains('about').click();
    cy.contains('about state loaded');

    cy.get('#about textarea')
      .type(' The quack white duck');

    cy.get('a').contains('home').click();
    cy.contains('home state loaded');

    cy.get('a').contains('about').click();
    cy.contains('about state loaded');

    cy.get('#about textarea')
      .should('have.value', 'Text entered here is not lost The quack white duck');
  });
});
