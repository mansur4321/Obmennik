const http = require("http");
const fs = require("fs");
const querystring = require("node:querystring");

const TelegramBot = require("node-telegram-bot-api");

const CRYPTO_API_KEY = "076f5977a4bd8b19590b0b61a0912acfe373f3830800c1eaa638c222354338cd";
const TG_API_KEY = "8045675354:AAHoNUt297syjuvwT7HOa-rHIjoQjchVG34";
const TG_BOT_URL = "https://t.me/Flichain_bot";
const MINI_APP_URL = "https://t.me/Flichain_bot/flichain";

const commands = [
	{
		command: "start",
		description: "Start chatting with a bot",
	},
	{
		command: "ref",
		description: "Get a referral link",
	},
];

let usersRefsMap = null;
fs.readFile("users-data.txt", "utf8", function (error, fileContent) {
	if (error || !fileContent.toString()) {
		usersRefsMap = new Map();
		console.log(error);
		return;
	}

	usersRefsMap = new Map([...JSON.parse()]);
});

function checkUserIsSubscribed(id) {
	const userId = typeof id !== "string" ? id.toString() : id;
	return usersRefsMap.has(userId);
}

function getUserReferrersData(id) {
	const userId = typeof id !== "string" ? id.toString() : id;

	if (!usersRefsMap.has(userId)) {
		return null;
	}

	return usersRefsMap.get(userId).referrers;
}

function addUser(id, name) {
	if (checkUserIsSubscribed(id)) return;

	usersRefsMap.set(id, {
		userID: id,
		userName: name,
		referrers: [],
	});

	let map = [];
	for (let entry of usersRefsMap) {
		map.push(entry);
	}

	fs.writeFile("users-data.txt", JSON.stringify(map), function (error) {
		if (error) return console.log(error);
	});
}

function addReferrer(userId, referrerId, referrerName) {
	if (!checkUserIsSubscribed(userId)) return;

	const userData = usersRefsMap.get(userId);

	if (userData.referrers.find((data) => data.referrerID === referrerId)) return;

	usersRefsMap.set(userId, {
		userName: userData.userName,
		userID: userData.userID,
		referrers: [
			...userData.referrers,
			{
				referrerID: referrerId,
				referrerName: referrerName,
			},
		],
	});

	let map = [];
	for (let entry of usersRefsMap) {
		map.push(entry);
	}

	fs.writeFile("users-data.txt", JSON.stringify(map), function (error) {
		if (error) return console.log(error);
	});
}

const bot = new TelegramBot(TG_API_KEY, {
	polling: {
		interval: 300,
		autoStart: true,
	},
});

bot.setMyCommands(commands);

bot.onText(/\/start(.*)/, async (msg, match) => {
	const chatId = msg.chat.id;
	const userId = typeof msg.from.id !== "string" ? msg.from.id.toString() : msg.from.id;
	const referrer = match[1] ? match[1].trim() : "";

	try {
		addUser(userId, msg.from.username);
		await bot.sendMessage(chatId, `Welcome! Now you can use the most convenient exchanger in TG`);

		console.log("====================", msg.text, msg, usersRefsMap);

		if (!referrer) return;

		addReferrer(referrer, userId, msg.from.username);
		await bot.sendMessage(chatId, `You've come at the invitation from: ${referrer}`);
	} catch (err) {
		console.log(err);
		await bot.sendMessage(msg.text + " - I don't understand the command. There are only commands /start and /ref");
	}
});
bot.onText(/\/ref/, async (msg) => {
	const chatId = msg.chat.id;

	try {
		await bot.sendMessage(
			chatId,
			`
			Your referral links for bot and tg mini app: \n
			Link to bot - ${TG_BOT_URL}?start=${msg.from.id} \n
			Link to tg mini app - ${MINI_APP_URL}?start=${msg.from.id}
			`
		);

		console.log("====================", msg.text, msg, usersRefsMap);
	} catch (err) {
		console.log(err);
	}
});

const server = http
	.createServer(async (request, response) => {
		if (request.method === "GET") {
			if (request.url === "/" || request.url.includes("/?")) {
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

			if (request.url.startsWith("/static")) {
				const imgName = request.url;

				fs.readFile(`./${imgName}`, (err, data) => {
					if (err) {
						response.writeHead(500);
						response.end(`Возникла ошибка при загрузке картинки ${imgName}. Опять эти невзгоды!`);
						return;
					}

					response.writeHead(200, { "Content-Type": "image/png" });
					response.end(data);
				});
			}

			if (request.url.startsWith("/check-subscribed")) {
				const { user_id } = querystring.parse(request.url.split("?")[1]);

				response.writeHead(200, { "Content-Type": "application/json" });
				response.end(
					JSON.stringify({
						userId: user_id,
						isSubscribed: checkUserIsSubscribed(user_id),
					})
				);
			}

			if (request.url.startsWith("/user")) {
				const { user_id } = querystring.parse(request.url.split("?")[1]);
				let data = getUserReferrersData(user_id);

				if (data === null) {
					response.writeHead(500, { "Content-Type": "application/json" });
					response.end();
					return;
				}

				const correctData = {
					refLink: `${MINI_APP_URL}?start=${user_id}`,
					referrers: data,
				};

				response.writeHead(200, { "Content-Type": "application/json" });
				response.end(JSON.stringify(correctData));
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
					response.end(JSON.stringify(err));
				}
			}

			if (request.url.startsWith("/get-currency-range")) {
				const { from, to } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/exchange-range/${from}_${to}?CRYPTO_API_KEY=${CRYPTO_API_KEY}`;

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
					response.end(JSON.stringify(err));
				}
			}

			if (request.url.startsWith("/get-estimated-exchange-amount")) {
				const { amount, from, to } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/exchange-amount/${amount}/${from}_${to}?CRYPTO_API_KEY=${CRYPTO_API_KEY}`;

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
					response.end(JSON.stringify(err));
				}
			}

			if (request.url.startsWith("/get-transaction-status")) {
				const { id } = querystring.parse(request.url.split("?")[1]);
				const api = `https://api.changenow.io/v1/transactions/${id}/${CRYPTO_API_KEY}`;

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
					response.end(JSON.stringify(err));
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

					const api = `https://api.changenow.io/v1/transactions/${CRYPTO_API_KEY}`;
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
						response.end(JSON.stringify(err));
					}
				});
			}
		}
	})
	.listen(80, function () {
		console.log("SERVER HOST - {http://localhost}:80");
	});
