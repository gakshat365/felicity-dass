const axios = require('axios');

(async () => {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@iiit.ac.in', password: 'adminpassword' });
        const token = loginRes.data.token;
        console.log('Logged in, trying to patch...');
        const patchRes = await axios.patch('http://localhost:5000/api/users/profile', { firstName: 'Admin', lastName: 'Test' }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('SUCCESS:', patchRes.status);
    } catch (e) {
        console.error('ERROR:', e.response ? `${e.response.status} ${e.response.data.message || e.response.data}` : e.message);
    }
})();
