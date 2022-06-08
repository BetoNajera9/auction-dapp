const grpc = require('@grpc/grpc-js')
const { signers } = require('@hyperledger/fabric-gateway')
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')

require('dotenv').config()

// Path to crypto materials.
const cryptoPath = process.env.CRYPTO_PATH

// Path to user private key directory.
const keyDirectoryPath = path.resolve(
	cryptoPath,
	'users',
	'User1@org1.example.com',
	'msp',
	'keystore'
)

// Path to user certificate.
const certPath = path.resolve(
	cryptoPath,
	'users',
	'User1@org1.example.com',
	'msp',
	'signcerts',
	'cert.pem'
)

// Path to peer tls certificate.
const tlsCertPath = path.resolve(
	cryptoPath,
	'peers',
	'peer0.org1.example.com',
	'tls',
	'ca.crt'
)

// Gateway peer endpoint.
const peerEndpoint = process.env.PEER_ENDPOINT || 'localhost:7051'

async function newGrpcConnection() {
	const tlsRootCert = await fs.readFile(tlsCertPath)
	const tlsCredentials = grpc.credentials.createSsl(tlsRootCert)
	return new grpc.Client(peerEndpoint, tlsCredentials, {
		'grpc.ssl_target_name_override': 'peer0.org1.example.com',
	})
}

async function newIdentity(mspId) {
	const credentials = await fs.readFile(certPath)
	return { mspId, credentials }
}

async function newSigner() {
	const files = await fs.readdir(keyDirectoryPath)
	const keyPath = path.resolve(keyDirectoryPath, files[0])
	const privateKeyPem = await fs.readFile(keyPath)
	const privateKey = crypto.createPrivateKey(privateKeyPem)
	return signers.newPrivateKeySigner(privateKey)
}

module.exports = {
	newGrpcConnection,
	newIdentity,
	newSigner,
}
