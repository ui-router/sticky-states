import React, { Component } from 'react';

class GenericCmp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: "Text entered here is not lost",
      stateName: props.$state$.name,
    }
  }

  handleChange(input) {
      this.setState({ text: input.target.value });
  }

  render() {
    return (
      <div>
        <h1>{this.state.stateName} state loaded</h1>
        <textarea
          value={this.state.text}
          onChange={(input) => this.setState({ text: input.target.value })}
        />
      </div>
    );
  }
}

export default GenericCmp;
