
const dispatcher = require("../dispatcher");
const DispatcherEvents = require("../constants/DispatcherEvents");
const SocketEvents = require("../constants/SocketEvents");

class RatesStore { //extends EventEmitter
    constructor() {
        this.rates = {};
    }

    get(sessionId) {
        return this.sessions[sessionId];
    }
    bindSocketServer(io) {
        this.io = io;

    }

    getSocketServer() {
        return this.io;
    }


    setRates(rates) {
        const ret = {};
        // Create key for each rate for index access
        rates.map((rate) => {
            ret[rate.shortCode] = rate;
        });
        this.rates = ret;
    }
    getRates() {
        return this.rates;
    }
}

const ratesStore = new RatesStore();

ratesStore.dispatchToken = dispatcher.register(({ event, sessionId, data }) => {
    switch (event) {
        case (DispatcherEvents.RATES_UPDATED):
            const { rates } = data;
            ratesStore.setRates(rates);
            // Emit to sockets
            ratesStore.io.emit(SocketEvents.RATES_UPDATED, ratesStore.getRates());
            break;
    }
    //ratesStore.emitChange(event, data);
});

module.exports = ratesStore;
