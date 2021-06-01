import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {withAuthenticator} from "@aws-amplify/ui-react";
import WebcamCapture from './App';
import reportWebVitals from './reportWebVitals';

const AppWithAuth = withAuthenticator(WebcamCapture);
const federated = {
    googleClientId: '102645471861-n1dep1gflm9f57gfcbmulf6s61esvbs1.apps.googleusercontent.com'
};

ReactDOM.render(
  <React.StrictMode>
    <AppWithAuth federate={federated} />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
