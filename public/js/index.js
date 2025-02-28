/* eslint-disable */

import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout, signup } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

// DOM ELEMENTS
const sectionMap = document.querySelector('.section-map');
const mapbox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const photo = document.getElementById('photo');
const userImg = document.querySelector('.form__user-photo');
const bookBtn = document.getElementById('book-tour');
const alertMessage = document.querySelector('body').dataset.alert;

// DELEGATION
if (sectionMap && mapbox) {
  const canvas = document.createElement('canvas');

  // WebGL (graphics acceleration)
  const gl =
    canvas.getContext('webgl') ||
    canvas.getContext('webgl2') ||
    canvas.getContext('experimental-webgl');

  if (gl) {
    // If WebGL is enabled in browser - display map
    const locations = JSON.parse(mapbox.dataset.locations);
    displayMap(locations);
  } else {
    // Otherwise - remove map to avoid errors
    sectionMap.parentElement.removeChild(sectionMap);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    await signup(name, email, password, passwordConfirm);
  });
}

if (userDataForm) {
  // Submit form
  userDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', photo.files[0]);
    await updateSettings(form, 'data');
  });

  // Update image
  photo.addEventListener('change', (e) => {
    e.preventDefault();
    const newImgFile = e.target.files?.[0];
    if (!newImgFile?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      userImg.setAttribute('src', reader.result);
    });

    reader.readAsDataURL(newImgFile);
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.querySelector('.btn--save--password');
    const tmpSaveBtnValue = saveBtn.textContent;
    saveBtn.textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');

    saveBtn.textContent = tmpSaveBtnValue;
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', async (e) => {
    const tmpBtnText = e.target.textContent;
    e.target.textContent = 'Processing...';

    const { tourId } = e.target.dataset;
    await bookTour(tourId);
    e.target.textContent = tmpBtnText;
  });
}

if (alertMessage) {
  showAlert('success', alertMessage, 7);
}
