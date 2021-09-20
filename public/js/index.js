/* eslint-disable */

import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import '@babel/polyfill';

//getting dom elements
//MAP
const mapBox = document.getElementById('map');

//Form
const form = document.querySelector('.form-login');

//Logout Button
const logOutBtn = document.querySelector('.nav__el--logout');

//user forms
const userPasswordForm = document.querySelector('.form-user-password');
const userDataForm = document.querySelector('.form-user-data');

//buy tour button
const bookBtn = document.getElementById('book-tour');

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (mapBox) {
  const locations = JSON.parse(
    document.getElementById('map').dataset.locations
  );
  displayMap(locations);
}

//adding eventListener to logout button
if (logOutBtn) {
  logOutBtn.addEventListener('click', function(e) {
    logout();
  });
}

//Form for changing name and email and saving the settings
if (userDataForm) {
  userDataForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateSettings(form, 'data');
    console.log(form);
  });
}

//form for changing password
if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    document.querySelector('.btn-save-password').textContent = '...Updating';

    await updateSettings(
      { currentPassword, password, passwordConfirm },
      'password'
    );
    document.querySelector('.btn-save-password').textContent = 'Save Password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', async function(e) {
    console.log(e.target);
    e.target.textContent = '...Processing';
    const { tourId } = e.target.dataset;
    await bookTour(tourId);
  });
}
