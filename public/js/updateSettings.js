/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const updateData = async (name, email) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: '/api/v1/users/update-me',
      data: {
        name,
        email,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Data updated successdully!');
      window.setTimeout(() => location.reload(true), 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
