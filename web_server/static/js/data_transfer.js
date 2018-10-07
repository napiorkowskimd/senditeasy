class DataTransfer {
    constructor(data_channel, id) {
        this.data_channel = data_channel;
        if(window.__transfers){
            window.__transfers += 1;
        } else {
            window.__transfers = 0;
        }
        if (id) {
            this.id = id;
        } else {
            this.id = window.__transfers;
        }
    }
    
}
