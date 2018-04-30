describe('example app', () => {
  it('loads', () => {
    cy.visit('');
  });

  it('renders links', () => {
    cy.visit('/');
    cy.get('a').contains('home');
    cy.get('a').contains('about');
  });

  it('home state has a textarea', () => {
    cy.visit('');
    cy.get('[ui-view=home] textarea');
  });

  it('retains text entered into the textarea in home', () => {
    cy.visit('');
    cy.get('[ui-view=home] textarea').type(' The quick brown fox');

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

    cy.get('[ui-view=home] textarea').should('have.value', 'Text entered here is not lost The quick brown fox');
  });

  it('retains text entered into the textarea in about', () => {
    cy.visit('');

    cy
      .get('a')
      .contains('about')
      .click();
    cy.contains('about state loaded');

    cy.get('[ui-view=about] textarea').type(' The quack white duck');

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

    cy.get('[ui-view=about] textarea').should('have.value', 'Text entered here is not lost The quack white duck');
  });
});
