const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const {OAuth2Client} = require('google-auth-library');

const app = express();
app.use(express.json());
app.use(cors());

const CLIENT_ID='995311730381-fslk423mb22uc1algiv24pb8nchfh9d0.apps.googleusercontent.com'
const client = new OAuth2Client(CLIENT_ID)

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`API listening on port ${port}`);
});

app.get('/', async (req, res) => {
    res.json({status: 'API running'});
})

admin.initializeApp({
	credential: admin.credential.applicationDefault()
})

const db = admin.firestore();

app.get('/boards/:boardId', async(req, res)=>{
	let id = req.params.boardId;
	let boardsRef = db.collection('boards');
	let query = boardsRef.where("__name__", "==", id);
	// let results = boardsRef.doc(id).get();
	let results = await query.get();
	let returnVal = results.docs.map(doc =>{
		return {document_id: doc.id, ...doc.data()}
	})

	res.json(returnVal)
});

app.get('/all', async(req, res)=>{
	//limiting to 100
	db.collection("boards").get().limit(100).then(function(querySnapshot) {
		let respon = []
	    querySnapshot.forEach(function(doc) {
	        respon.push({document_id: doc.id, ...doc.data()});
	    });
	    res.json(respon)
	});
});

app.get('/query', async(req, res)=>{
	const name = req.query.name;
	const bydate = req.query.bydate;
	const size = req.query.size;
	const active = req.query.active;
	const details = req.query.details || false;

	let boardsRef = db.collection('boards');
	let query = boardsRef

	if(name){
		query = query.where("name", "==", name);
	}
	if(bydate=="asc" || bydate=="desc"){
		query = query.orderBy("created", bydate)
	}
	if(active=="true" || active =="false"){
		if(active == "true"){
			query = query.where("active", "==", true)
		}else{
			query = query.where("active", "==", false)
		}
	}

	let s = parseInt(size)
	if(s > 0){
		query = query.limit(s)
	}else{
		query = query.limit(25)
	}

	if(details!=="true"){
		query=query.select("name", "created", "active")
	}

	let results = await query.get();
	let returnVal = results.docs.map(doc =>{
		return {document_id: doc.id, ...doc.data()}
	})

	res.json(returnVal);

});

app.get('/myBoards', async(req, res)=>{
	let userId = await getUserId(req.headers['authorization'])
	if(userId){
		const creator = req.query.creator;

		let boardsRef = db.collection('boards');
		let query = boardsRef


		query = query.where("creator", "==", userId);
		query=query.select("name", "created", "active")

		let results = await query.get();
		let returnVal = results.docs.map(doc =>{
			return {document_id: doc.id, ...doc.data()}
		})

		res.json(returnVal);
	}else{
		res.status(401).send()
	}

});


//create boards
app.post('/boards', async (req, res) => {
	let userId = await getUserId(req.headers['authorization'])
	if(userId){
	    const data = {
	        name: req.body.name || "New Board",
	        cards: req.body.cards || [],
	        active: req.body.active || true,
	        created: admin.firestore.Timestamp.now(),
	        creator: userId
	    }

	    await db.collection('boards').add(data).then(function(docRef) {
	    	res.json({ status: 'success', data: { document_id: docRef.id, ...data } });
		})
		.catch(function(error) {
			res.status(500).send(error);
		});
	}else{
		res.status(401).send()
	}
})

//update boards
//https://cloud.google.com/firestore/docs/manage-data/add-data
app.put('/boards/:boardId', async(req, res)=>{
	let userId = await getUserId(req.headers['authorization'])
	// if(hasAdminAccess(userId)){
		try {
		    const id = req.params.boardId;
		    if (!id) throw new Error('id is blank');

		    const data = {}
		    //probably should put some more validations in here
		    if(req.body.name){ data.name = req.body.name}
		    if(req.body.active){ data.active = req.body.active}
		    if(req.body.cards){ data.cards = req.body.cards}

		    const boardsRef = await db.collection('boards').doc(id).update(data).then(function(docRef) {
			    console.log(docRef)
			    res.json({
			    	status: 'sucess',
			        document_id: id
			    })
			})
			.catch(function(error) {
			    res.status(500).send(error);
			});


		} catch(error){
			res.status(500).send(error);
		}
	// }else{
	// 	res.status(401).send()
	// }
});


//delete boards
app.delete('/boards/:boardId', async (req, res) => {
	let userId = await getUserId(req.headers['authorization'])
	if(userId && hasAdminAccess(userId)){
	  try {

	    const id = req.params.boardId;

	    if (!id) throw new Error('id is blank');

	    await db.collection('boards').doc(id).delete();

	    res.json({
	    	status: 'success',
	        document_id: id,
	    })


	  } catch(error){

	    res.status(500).send(error);

	  }
	}else{
		res.status(403).send()
	}

});




async function getUserId(authorizationHeader) {
  try {
    const userJwtToken = authorizationHeader.replace('Bearer ', '');
    const ticket = await client.verifyIdToken({
      idToken: userJwtToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userId = payload['sub'] || payload['hd'];
    return userId;
  }
  catch (ex) {
    console.error(ex);
    return '';
  }
}

function hasAdminAccess(userId) {
  const userIds = ['106645276822529263714'];
  return userIds.includes(userId);
}