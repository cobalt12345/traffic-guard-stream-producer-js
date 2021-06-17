
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {withAuthenticator} from "@aws-amplify/ui-react";
import {default as WebcamCapture, FRAGMENT_DURATION_IN_FRAMES, TARGET_FPS} from "./App";

import reportWebVitals from './reportWebVitals';

const AppWithAuth = withAuthenticator(WebcamCapture);

ReactDOM.render(
  <React.StrictMode>
      <AppWithAuth bufferSize={FRAGMENT_DURATION_IN_FRAMES} target_fps={TARGET_FPS} />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
