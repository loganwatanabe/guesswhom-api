const admin = require('firebase-admin');
const express = require('express');

const app = express();
app.use(express.json());

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


//create boards
app.post('/boards', async (req, res) => {
    const data = {
        name: req.body.name || "New Board",
        cards: req.body.cards || [],
        active: req.body.active || true,
        created: admin.firestore.Timestamp.now()
    }

    await db.collection('boards').add(data).then(function(docRef) {
    	res.json({ status: 'success', data: { id: docRef.id, ...data } });
	})
	.catch(function(error) {
		res.status(500).send(error);
	});
})

//update boards
//https://cloud.google.com/firestore/docs/manage-data/add-data
app.put('/boards/:boardId', async(req, res)=>{
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
		        id: id
		    })
		})
		.catch(function(error) {
		    res.status(500).send(error);
		});


	} catch(error){

		res.status(500).send(error);

	}
});


//delete boards
app.delete('/boards/:boardId', async (req, res) => {
  try {

    const id = req.params.boardId;

    if (!id) throw new Error('id is blank');

    await db.collection('boards').doc(id).delete();

    res.json({
    	status: 'success',
        id: id,
    })


  } catch(error){

    res.status(500).send(error);

  }

});