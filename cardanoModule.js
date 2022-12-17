const Blockfrost = require("@blockfrost/blockfrost-js");
const CardanocliJs = require("../cardanocli-js/index.js");

class CardanoPreviewTestnetUtils {
    /**
     *
     * @param {Object} options
     * @param {path=} options.shelleyGenesisPath
     * @param {path=} options.socketPath - Default: Env Variable
     * @param {path=} options.dir - Working Directoy For Transactions
     * @param {string=} options.projectId - blockfrost project ID
     */

    constructor(options) {
        this.shelleyPath = options.shelleyPath;
        this.socketPath = options.socketPath;
        this.dir = options.dir;
        this.cliPath = "cardano-cli"; //setup for environment variable!
        this.projectId = options.projectId;

        this.cardanoCLIInterface = new CardanocliJs({
            shelleyGenesisPath: this.shelleyPath,
            socketPath: this.socketPath,
            //cliPath = "", defaultno ce biti environment varijabla pa se moze ostaviti prazno
            dir: this.dir,
            //era : "Babbage",
            network: "testnet-magic 2",
        });

        this.BlockfrostAPI = new Blockfrost.BlockFrostAPI({
            projectId: this.projectId,
        });
    }
    /**
     *
     * @param {JSON} metadata - Metadata you want to place in the transaction in JSON format
     * @param {string=} walletAddress - payment.addr for your Cardano wallet. Make sure you have enough test Lovelace in your wallet!
     * @param {path=} signingKeyFile - Path to the payment.skey file for your Cardano wallet, required to sign a transaction
     * @returns {string=} Hash of a transaction which this method has created, containing desired metadata
     */
    makeATransaction(metadata, walletAddress, signingKeyFile) {
        let queryRes = this.cardanoCLIInterface.queryUtxo(walletAddress);
        //console.log("Ovo je stanje vrha: " + queryRes) //
        let initialLovelaceValue = queryRes[0].value.lovelace;

        let txInObject = {
            txHash: queryRes[0].txHash, //izvlacenje vrijednosti iz objekta, moramo koristiti ovakve objekte jer je tako definirano u dokumentaciji, inace imamo problema s undefined
            txId: 0,
        };
        let txOutObject = {
            address: walletAddress,
            value: {
                lovelace: "0",
            },
        };

        let transaction = this.cardanoCLIInterface.transactionBuildRaw({
            txIn: [txInObject], //moram ovo staviti jer inače ne prihvaća funkciju u helper.js koja prepostavlja da je ovaj objekt array, korisi forEach
            txOut: [txOutObject],
            metadata: metadata,
            fee: 0,
        }); //console.log(transaction);

        let transactionMinFee = this.cardanoCLIInterface.transactionCalculateMinFee({
            txBody: transaction,
            txIn: [txInObject],
            txOut: [txOutObject],
            witnessCount: 1,
        }); //console.log(transactionMinFee)

        txOutObject.value.lovelace = initialLovelaceValue - transactionMinFee;

        transaction = this.cardanoCLIInterface.transactionBuildRaw({
            txIn: [txInObject], //moram ovo staviti jer inače ne prihvaća funkciju u helper.js koja prepostavlja da je ovaj objekt array
            txOut: [txOutObject],
            metadata: metadata,
            fee: transactionMinFee,
        });
        console.log("Transaction draft file: " + transaction);

        let signedTransaction = this.cardanoCLIInterface.transactionSign({
            signingKeys: [signingKeyFile],
            txBody: transaction,
        });
        console.log("Signed transaction file: " + signedTransaction);

        return this.cardanoCLIInterface.transactionSubmit(signedTransaction); //this line submits the transaction and returns the hash of the created transaction
    }

    /**
     *
     * @param {string} hash - Transaction Hash/Id that you want to search for
     * @returns {Object[]} Blockfrost API result for wanted TxId
     */
    async searchMetadataByTxHash(hash) {
        return this.BlockfrostAPI.txsMetadata(hash)
            .then((res) => {
                return res;
            })
            .catch((err) => {
                return err;
            });
    }
}

module.exports = CardanoPreviewTestnetUtils;
