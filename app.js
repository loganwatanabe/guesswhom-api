const admin = require('firebase-admin');
const express = require('express');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

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

app.get('/:boardId', async(req, res){
	let id = req.params.boardId;
	let boardsRef = db.connection('boards');
	let query = boardsRef.where("id", "==", id);
	let results = await query.get();
	let returnVal = results.docs.map(doc =>{
		return {...doc.data()}
	})

	res.json(returnVal)
})