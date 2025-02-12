/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

// Type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  const url = type === 'password' ? '/api/v1/users/update-my-password' : '/api/v1/users/update-me';
  try {
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successdully!`);
      window.setTimeout(() => location.reload(true), 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
