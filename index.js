const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const path = require('path')

const Api = require('./api')

const api = new Api()
const app = express()

const viewsDirPath = path.join(__dirname, 'templates', 'views')
app.use(bodyParser.urlencoded({ extended: false }))
app.set('view engine', 'ejs')
app.set('views', viewsDirPath)
app.use(express.static(path.join(__dirname, 'public')))

app.get('/assets', async (req, res) => {
	await api.setConnection()
	await api.initLedger(api.getContract())

	const assets = await api.getAllAssets(api.getContract())

	res.render('assets', {
		assets,
	})
})

app.get('/asset/:id', async (req, res) => {
	const id = parseInt(req.params.id)
	await api.setConnection()
	await api.initLedger()

	const result = await api.getAllAssets(api.getContract())
	console.log(result)

	res.render('index', {
		data: { paramsId: id, ...result[id] },
	})
})

app.post('/setAsset/:id', async (req, res) => {
	let index = parseInt(req.params.id)
	const id = req.query.id
	const car = req.query.car
	const price = req.query.price
	const owner = req.query.owner

	await api.setConnection()
	const result = await api.getAllAssets(api.getContract())

	index < result.length - 1 ? index++ : (index = 0)

	await api.updateAsset(api.getContract(), id, car, price, owner)

	res.redirect(`/asset/${index}`)
})

app.get('*', (req, res) => {
	res.redirect('/assets')
})

app.listen(3000, () => {
	console.log('Server started on port 3000')
})
