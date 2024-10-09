new Vue({
	el: "#exchanger",
	data() {
		return {
			exchangeFrom: {
				error: "err",
			},
			exchangeTo: {
				error: "err",
			},

			activeCrypto: {
				from: false,
				to: false,
			},

			optionsFrom: [
				{
					name: "BTC",
					alias: "",
					isSelected: true,
				},
				{
					name: "TON",
					alias: "",
					isSelected: false,
				},
				{
					name: "SOL",
					alias: "",
					isSelected: false,
				},
				{
					name: "TRX",
					alias: "",
					isSelected: false,
				},
			],
			optionsTo: [
				{
					name: "BTC",
					alias: "",
					isSelected: true,
				},
				{
					name: "TON",
					alias: "",
					isSelected: false,
				},
				{
					name: "SOL",
					alias: "",
					isSelected: false,
				},
				{
					name: "TRX",
					alias: "",
					isSelected: false,
				},
			],
		};
	},
	created() {},

	computed: {
		from() {
			return this.optionsFrom.find((option) => option.isSelected).name;
		},
		to() {
			return this.optionsTo.find((option) => option.isSelected).name;
		},
	},
	methods: {
		changeCryptoFrom(selectedOption) {
			this.optionsFrom.forEach((option) => {
				if (option.name === selectedOption) {
					option.isSelected = true;
					return;
				}

				option.isSelected = false;
			});

			this.activeCrypto.from = false;
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
		},

		openCryptoFrom() {
			this.activeCrypto.from = !this.activeCrypto.from;
			this.activeCrypto.to = false;
		},
		openCryptoTo() {
			this.activeCrypto.to = !this.activeCrypto.to;
			this.activeCrypto.from = false;
		},
	},
});
