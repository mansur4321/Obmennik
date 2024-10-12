const http = require("http");
const fs = require("fs");
const querystring = require("node:querystring");

const API_KEY = "076f5977a4bd8b19590b0b61a0912acfe373f3830800c1eaa638c222354338cd";

const server = http
	.createServer(async (request, response) => {
		if (request.method === "GET") {
			if (request.url === "/") {
				fs.readFile("index.html", (err, data) => {
					if (err) {
						response.writeHead(500);
						response.end("Возникла ошибка при загрузке index.html. Опять эти невзгоды!");
						return;
					}

					response.writeHead(200, { "Content-Type": "text/html" });
					response.end(data.toString());
				});
			}

			if (request.url === "/main.js") {
				fs.readFile("main.js", (err, data) => {
					if (err) {
						response.writeHead(500);
						response.end("Возникла ошибка при загрузке index.html. Опять эти невзгоды!");
						return;
					}

					response.writeHead(200, { "Content-Type": "application/json" });
					response.end(data.toString());
				});
			}

			if (request.url === "/style.css") {
				fs.readFile("style.css", (err, data) => {
					if (err) {
						response.writeHead(500);
						response.end("Возникла ошибка при загрузке style.css. Опять эти невзгоды!");
						return;
					}

					response.writeHead(200, { "Content-Type": "text/css" });
					response.end(data.toString());
				});
			}

			if (request.url === "/get-currencies-data") {
				const currencies = ["btc", "ton", "sol", "trx"];
				const api = `https://api.changenow.io/v1/currencies/`;

				try {
					const responses = await Promise.all([
						fetch(api + currencies[0]),
						fetch(api + currencies[1]),
						fetch(api + currencies[2]),
						fetch(api + currencies[3]),
					]);
					let messages = [];

					for (let resp of responses) {
						if (resp.status !== 200) {
							const errorMessage = await resp.json();
							throw Error(`Ошибка - ${errorMessage.error}. ${errorMessage.message}`);
						}

						messages.push(await resp.json());
					}

					response.writeHead(200, { "Content-Type": "application/json" });
					response.end(JSON.stringify(messages.map((item) => item.image)));
				} catch (err) {
					console.error(err);
					response.writeHead(400, { "Content-Type": "application/json" });
					response.end(err);
				}
			}

			if (request.url.startsWith("/get-currency-range")) {
				const { from, to } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/exchange-range/${from}_${to}?api_key=${API_KEY}`;

				try {
					const resp = await fetch(api);

					if (resp.status !== 200) {
						const errorMessage = await resp.json();
						throw Error(`Ошибка - ${errorMessage.error}. ${errorMessage.message}`);
					}

					const message = await resp.json();

					response.end(
						JSON.stringify({
							min: message.minAmount,
							max: message.maxAmount,
						})
					);
				} catch (err) {
					console.error(err);
					response.writeHead(400, { "Content-Type": "application/json" });
					response.end(err);
				}
			}

			if (request.url.startsWith("/get-estimated-exchange-amount")) {
				const { amount, from, to } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/exchange-amount/${amount}/${from}_${to}?api_key=${API_KEY}`;

				try {
					const resp = await fetch(api);

					if (resp.status !== 200) {
						const errorMessage = await resp.json();
						throw Error(`Ошибка - ${errorMessage.error}. ${errorMessage.message}`);
					}

					const message = await resp.json();

					response.end(
						JSON.stringify({
							estimatedAmount: message.estimatedAmount,
						})
					);
				} catch (err) {
					console.error(err);
					response.writeHead(400, { "Content-Type": "application/json" });
					response.end(err);
				}
			}

			if (request.url.startsWith("/get-transaction-status")) {
				const { id } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/transactions/${id}/${API_KEY}`;

				try {
					const resp = await fetch(api);

					if (resp.status !== 200) {
						const errorMessage = await resp.json();
						throw Error(`Ошибка - ${errorMessage.error}. ${errorMessage.message}`);
					}

					const message = await resp.json();

					response.end(
						JSON.stringify({
							status: message.status,
						})
					);
				} catch (err) {
					console.error(err);
					response.writeHead(400, { "Content-Type": "application/json" });
					response.end(err);
				}
			}
		}

		if (request.method === "POST") {
			if (request.url === "/create-exchange-transaction") {
				let data = "";

				request.on("data", (chunk) => {
					data += chunk;
				});
				request.on("end", async () => {
					const { from, to, address, amount } = await JSON.parse(data);

					const api = `https://api.changenow.io/v1/transactions/${API_KEY}`;
					const body = {
						from: from,
						to: to,
						address: address,
						amount: amount,
						extraId: "",
						userId: "",
						contactEmail: "",
						refundAddress: "",
						refundExtraId: "",
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
							throw Error(`Ошибка - ${errorMessage.error}. ${errorMessage.message}`);
						}

						const message = await resp.json();

						response.end(
							JSON.stringify({
								payinAddress: message.payinAddress,
								id: message.id,
								amount: message.amount,
							})
						);
					} catch (err) {
						console.error(err);
						response.writeHead(400, { "Content-Type": "application/json" });
						response.end(err);
					}
				});
			}
		}
	})
	.listen(3000, function () {
		console.log("SERVER HOST - http://localhost:3000");
	});
