
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

app.use(bodyParser.json());
app.use(cors());

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
    rejectUnauthorized: false
    }
  }
});

app.get('/', (req, res) => {
	res.send('woohoo');
})
	
app.post('/signin', (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json('wrong signin input')
	}
	db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('user not found'))
      } 
      else {
        res.status(400).json('wrong input')
      }
    })
    .catch(err => res.status(400).json('wrong input'))
})


app.post('/register', (req, res) => {
	const { name, email, password } = req.body;
	if (!name || !email || !password) {
		return res.status(400).json('wrong register input')
	}
	const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
	  .into('login')
	  .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
       .then(user => {
           res.json(user[0]);
        })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
	.catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	db.select('*').from('users').where({id})
	.then(user => {
		if (user.lenght) {
			res.json(user[0])
		}
		else {
			res.status(400).json('user not found')
		}
	})
})

app.put('/image', (req, res) => {
  	const { id } = req.body;
	db('users').where('id', '=', id)
  .increment('count', 1)
  .returning('count')
  .then(count => {
  	res.json(count[0])
  	})
  .catch(err => res.status(400).json('unable to add count'))
})

/*app.put('/image', (req, res) => {
  	const { id } = req.body;
	let found = false;
	database.users.forEach(user => {
		if (user.id === id) {
			found = true;
			const updatedUser = {...user, count: user.count +1}
			database.users = database.users.map(usr => 
				usr.id == id ? updatedUser : usr
			)
			return res.json(updatedUser.count);
		}
	})
})*/


app.listen(process.env.PORT || 3000, () => {
	console.log('app is running on some port');
})


