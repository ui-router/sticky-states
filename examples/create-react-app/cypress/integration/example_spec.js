describe('example app', () => {
  it('loads', () => {
    cy.visit('');
  });

  it('renders links', () => {
    cy.visit('/');
    cy.get('a').contains('home');
    cy.get('a').contains('about');
  });

  it('renders home by default', () => {
    cy.visit('/');
    cy.contains('home state loaded');
  });

  it('home state has a textarea', () => {
    cy.visit('');
    cy.get('#home textarea');
  });

  it('retains text entered into the textarea in home', () => {
    cy.visit('');
    cy.get('#home textarea').type(' The quick brown fox');

    cy
      .get('a')
      .contains('about')
      .click();
    cy.contains('about state loaded');

    cy
      .get('a')
      .contains('home')
      .click();
    cy.contains('home state loaded');

    cy.get('#home textarea').should('have.value', 'Text entered here is not lost The quick brown fox');
  });

  it('retains text entered into the textarea in about', () => {
    cy.visit('');

    cy
      .get('a')
      .contains('about')
      .click();
    cy.contains('about state loaded');

    cy.get('#about textarea').type(' The quack white duck');

    cy
      .get('a')
      .contains('home')
      .click();
    cy.contains('home state loaded');

    cy
      .get('a')
      .contains('about')
      .click();
    cy.contains('about state loaded');

    cy.get('#about textarea').should('have.value', 'Text entered here is not lost The quack white duck');
  });
});
