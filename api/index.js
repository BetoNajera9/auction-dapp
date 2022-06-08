const grpc = require('@grpc/grpc-js')
const { connect, GatewayError } = require('@hyperledger/fabric-gateway')
const { TextDecoder } = require('util')
const { newGrpcConnection, newIdentity, newSigner } = require('./connect')

class App {
	constructor() {
		this.channelName = 'mychannel'
		this.chaincodeName = 'basic'
		this.mspId = 'Org1MSP'

		this.utf8Decoder = new TextDecoder()
		this.assetId = this.getAssetId()

		this.initLedgerFlag = false
	}

	async setConnection() {
		const client = await newGrpcConnection()
		this.client = client

		this.gateway = connect({
			client,
			identity: await newIdentity(this.mspId),
			signer: await newSigner(),
			evaluateOptions: () => {
				return { deadline: Date.now() + 5000 } // 5 seconds
			},
			endorseOptions: () => {
				return { deadline: Date.now() + 15000 } // 15 seconds
			},
			submitOptions: () => {
				return { deadline: Date.now() + 5000 } // 5 seconds
			},
			commitStatusOptions: () => {
				return { deadline: Date.now() + 60000 } // 1 minute
			},
		})

		this.network = this.gateway.getNetwork(this.channelName)
		this.contract = this.network.getContract(this.chaincodeName)
	}

	getNetwork() {
		return this.network
	}
	getContract() {
		return this.contract
	}
	getAssetId() {
		const now = Date.now()
		return `asset${now}`
	}

	async initLedger(contract) {
		if (!this.initLedgerFlag) {
			console.log(
				'\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger'
			)

			await contract.submitTransaction('InitLedger')

			console.log('*** Transaction committed successfully')
			this.initLedgerFlag = true
		}
	}

	async getAllAssets(contract) {
		console.log(
			'\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger'
		)

		const resultBytes = await contract.evaluateTransaction('GetAllAssets')

		const resultJson = this.utf8Decoder.decode(resultBytes)
		return JSON.parse(resultJson)
	}

	async createAsset(contract) {
		console.log(
			'\n--> Submit Transaction: CreateAsset, creates new asset with ID, Car, Price, Owner and AppraisedValue arguments'
		)

		await contract.submitTransaction(
			'CreateAsset',
			this.assetId,
			'Porsche Carrera GT',
			'5',
			'Tom'
		)

		console.log('*** Transaction committed successfully')
	}

	async transferAssetAsync(contract, assetIdOld, assetIdNew) {
		console.log(
			'\n--> Async Submit Transaction: TransferAsset, updates existing asset owner'
		)

		const commit = await contract.submitAsync('TransferAsset', {
			arguments: [assetIdOld, assetIdNew],
		})
		const oldOwner = this.utf8Decoder.decode(commit.getResult())

		console.log(
			`*** Successfully submitted transaction to transfer ownership from ${oldOwner} to Saptha`
		)
		console.log('*** Waiting for transaction commit')

		const status = await commit.getStatus()
		if (!status.successful) {
			throw new Error(
				`Transaction ${status.transactionId} failed to commit with status code ${status.code}`
			)
		}

		console.log('*** Transaction committed successfully')
	}

	async readAssetByID(contract) {
		console.log(
			'\n--> Evaluate Transaction: ReadAsset, function returns asset attributes'
		)

		const resultBytes = await contract.evaluateTransaction(
			'ReadAsset',
			this.assetId
		)

		const resultJson = this.utf8Decoder.decode(resultBytes)
		const result = JSON.parse(resultJson)
		console.log('*** Result:', result)
	}

	async updateAsset(contract, id, car, price, owner) {
		console.log(
			'\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error'
		)

		try {
			await contract.submitTransaction('UpdateAsset', id, car, price, owner)
			console.log('******** UPDATED')
		} catch (error) {
			console.log('*** Error: \n', error)
		}
	}

	envOrDefault(key, defaultValue) {
		return process.env[key] || defaultValue
	}

	async displayInputParameters() {
		console.log(`channelName:       ${this.channelName}`)
		console.log(`chaincodeName:     ${this.chaincodeName}`)
		console.log(`mspId:             ${this.mspId}`)
	}

	close(events) {
		console.log(events)
		this.gateway.close()
		this.client.close()
	}
}

module.exports = App
