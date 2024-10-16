const HOST = "https://flichain-flichain.amvera.io";
const tg = window.Telegram.WebApp;

async function createExchangeTransaction({ from, to }, amountFrom, userAddress) {
	const api = `${HOST}/create-exchange-transaction`;
	const body = {
		from: from,
		to: to,
		address: userAddress,
		amount: amountFrom,
	};

	try {
		const resp = await fetch(api, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (resp.status !== 200) {
			const errorMessage = await resp.json();
			throw Error(`Ошибка - ${errorMessage}`);
		}

		const message = await resp.json();

		return {
			payinAddress: message.payinAddress,
			id: message.id,
			amount: message.amount,
		};
	} catch (err) {
		console.error(err);
	}
}

async function getCurrenciesData() {
	const api = `${HOST}/get-currencies-data`;

	try {
		const resp = await fetch(api);

		if (resp.status !== 200) {
			const errorMessage = await resp.json();
			throw Error(`Ошибка - ${errorMessage.error}`);
		}

		const message = await resp.json();

		return message;
	} catch (err) {
		console.error(err);
	}
}

async function getCurrencyRange(currFrom, currTo) {
	const api = `${HOST}/get-currency-range?from=${currFrom}&to=${currTo}`;

	try {
		const resp = await fetch(api);

		if (resp.status !== 200) {
			const errorMessage = await resp.json();
			throw Error(`Ошибка - ${errorMessage.error}`);
		}

		const message = await resp.json();

		return message;
	} catch (err) {
		console.error(err);
	}
}

async function getEstimatedExchangeAmount({ from, to }, amountFrom) {
	const api = `${HOST}/get-estimated-exchange-amount?amount=${amountFrom}&from=${from}&to=${to}`;

	try {
		const resp = await fetch(api);

		if (resp.status !== 200) {
			const errorMessage = await resp.json();
			throw Error(`Ошибка - ${errorMessage.error}`);
		}

		const message = await resp.json();

		return message.estimatedAmount;
	} catch (err) {
		console.error(err);
	}
}

async function getTransactionStatus(ID) {
	const api = `${HOST}/get-transaction-status?id=${ID}`;

	try {
		const resp = await fetch(api);

		if (resp.status !== 200) {
			const errorMessage = await resp.json();
			throw Error(`Ошибка - ${errorMessage.error}`);
		}

		const message = await resp.json();

		return message.status;
	} catch (err) {
		console.error(err);
	}
}

new Vue({
	el: "#exchanger",
	data() {
		return {
			timeout: null,

			stage: 0,

			transactionID: "",

			amountFrom: 0,
			amountTo: 0,

			min: 0,
			max: null,

			userAddress: "",
			adminAddress: "",

			activeCrypto: {
				from: false,
				to: false,
			},

			optionsFrom: [
				{
					name: "BTC",
					alias: "btc",
					isSelected: true,
				},
				{
					name: "TON",
					alias: "ton",
					isSelected: false,
				},
				{
					name: "SOL",
					alias: "sol",
					isSelected: false,
				},
				{
					name: "TRX",
					alias: "trx",
					isSelected: false,
				},
			],
			optionsTo: [
				{
					name: "BTC",
					alias: "btc",
					isSelected: false,
				},
				{
					name: "TON",
					alias: "ton",
					isSelected: true,
				},
				{
					name: "SOL",
					alias: "sol",
					isSelected: false,
				},
				{
					name: "TRX",
					alias: "trx",
					isSelected: false,
				},
			],

			statuses: [
				{
					id: "waiting",
					name: "Awaiting deposit",
					status: false,
				},
				{
					id: "confirming",
					name: "Confirming",
					status: false,
				},
				{
					id: "exchanging",
					name: "Exchanging",
					status: false,
				},
				{
					id: "sending",
					name: "Sending to you",
					status: false,
				},
			],

			colorCopyIcon: "#808086",
		};
	},
	async created() {
		const currenciesData = await getCurrenciesData(); //API

		for (let i = 0; i < 4; i++) {
			this.optionsFrom[i].image = currenciesData[i];
			this.optionsTo[i].image = currenciesData[i];
		}

		const { min, max } = await getCurrencyRange(this.optionsFrom[0].alias, this.optionsTo[1].alias); //API

		this.min = min;
		this.max = max;
		this.amountFrom = min;

		await this.recalcFinalAmount();
	},

	computed: {
		currencyFrom() {
			return this.optionsFrom.find((option) => option.isSelected);
		},
		currencyTo() {
			return this.optionsTo.find((option) => option.isSelected);
		},
	},
	watch: {
		amountFrom(value) {
			const that = this;
			clearTimeout(this.timeout);

			this.timeout = setTimeout(() => {
				if (value === null) {
					that.amountFrom = 0;
				}

				if (value < that.min) {
					that.amountFrom = that.min;
				}

				if (that.max !== null && value > that.max) {
					that.amountFrom = that.max;
				}

				that.recalcFinalAmount();
			}, 1000);
		},
	},
	methods: {
		async updateAmounts() {
			this.amountFrom = null;

			const { min, max } = await getCurrencyRange(this.currencyFrom.alias, this.currencyTo.alias); //API

			this.min = min;
			this.max = max;
			this.amountFrom = min;

			await this.recalcFinalAmount();
		},
		async recalcFinalAmount() {
			try {
				const recalcAmount = await getEstimatedExchangeAmount(
					{
						from: this.currencyFrom.alias,
						to: this.currencyTo.alias,
					},
					this.amountFrom
				); // API

				this.amountTo = recalcAmount;
			} catch (err) {
				console.error(err);
			}
		},

		exchange() {
			this.stage = 1;
		},

		async confirmTransaction() {
			try {
				const { payinAddress, id, amount } = await createExchangeTransaction(
					{
						from: this.currencyFrom.alias,
						to: this.currencyTo.alias,
					},
					this.amountFrom,
					this.userAddress
				); // API

				this.transactionID = id;
				this.amountTo = amount;
				this.adminAddress = payinAddress;

				this.stage = 2;
				this.statusChecked();
			} catch (err) {
				console.error(err);
			}
		},

		statusChecked() {
			const that = this;
			const statusGetter = setInterval(async () => {
				try {
					const status = await getTransactionStatus(that.transactionID); // API
					that.statuses.find((item) => item.id === status).status = true;

					let flag = false;
					for (let i = 3; i >= 0; i--) {
						if (flag && !that.statuses[i].status) {
							that.statuses[i].status = false;
							continue;
						}

						if (that.statuses[i].status) {
							flag = true;
						}
					}
				} catch (err) {
					console.log(err);
				}

				if (that.statuses[3].status) {
					clearInterval(statusGetter);
				}
			}, 5000);
		},

		changeCryptoFrom(selectedOption) {
			this.optionsFrom.forEach((option) => {
				if (option.name === selectedOption) {
					option.isSelected = true;
					return;
				}

				option.isSelected = false;
			});

			this.activeCrypto.from = false;
			this.updateAmounts();
		},
		changeCryptoTo(selectedOption) {
			this.optionsTo.forEach((option) => {
				if (option.name === selectedOption) {
					option.isSelected = true;
					return;
				}

				option.isSelected = false;
			});

			this.activeCrypto.to = false;
			this.recalcFinalAmount();
		},

		openCryptoFrom() {
			this.activeCrypto.from = !this.activeCrypto.from;
			this.activeCrypto.to = false;
		},
		openCryptoTo() {
			this.activeCrypto.to = !this.activeCrypto.to;
			this.activeCrypto.from = false;
		},

		copyInClipboard(text) {
			navigator.clipboard.writeText(text);
			this.colorCopyIcon = "#227aff";

			const that = this;
			setTimeout(() => {
				that.colorCopyIcon = "#808086";
			}, 2000);
		},
	},
});
