var axios = require('axios');

function harperCreateUser(from_username, to_username) {
    const dbUrl = process.env.HARPERDB_URL;
    const dbPw = process.env.HARPERDB_PW;
    if (!dbUrl || !dbPw) return null;
  
    var data = JSON.stringify({
      operation: 'insert',
      schema: 'user_contact',
      table: 'invitations',
      records: [
        {
          from_username,
          to_username
        },
      ],
    })

    var config = {
        method: 'post',
        url: dbUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: dbPw,
        },
        data: data,
    };

    return new Promise((resolve, reject) => {
        axios(config)
          .then(function (response) {
            resolve(JSON.stringify(response.data));
          })
          .catch(function (error) {
            reject(error);
          });
    });
}

module.exports = harperCreateUser;