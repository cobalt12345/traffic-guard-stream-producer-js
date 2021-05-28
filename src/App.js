import logo from './logo.svg';
import './App.css';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import * as React from "react";
import { Auth } from 'aws-amplify';

export default withAuthenticator(App);

class LoginForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      userName: '',
      userPassword: '',
      toString: function() {
        return `User name: '${this.userName}' User password: '${this.userPassword.replaceAll(/./g, 
            '*')}'`;
      }
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    let formState = this.state;
    formState[event.target.id] = event.target.value;
    this.setState(formState);
    console.debug(`Something changed ${formState}`);
  }

  async handleSubmit(event) {
    try {
      const user = await Auth.signIn(this.state.userName, this.state.userPassword);
    } catch (e) {
      console.error(`User cannot be authenticated! ${e}`);
    }
    event.preventDefault();
  }


  render() {
    return (<form onSubmit={this.handleSubmit}>
      <div>
        <input type="text" id="userName" value={this.state.userName} onChange={this.handleChange}/>
      </div>
      <div>
        <input type="password" id="userPassword" value={this.state.userPassword} onChange={this.handleChange}/>
      </div>
      <div>
        <button type="submit" value="Sign In">Sign in</button>
      </div>
      <div>
        <AmplifySignOut />
      </div>
    </form>);
  }

  authenticateUser(e) {
    console.debug(`Submit auth. form... ${e}`);
  }

}

// export default LoginForm;

function App() {
  return (
    <div className="App">

    </div>
  );
}

// export default App;
