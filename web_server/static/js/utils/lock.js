class Lock {
    constructor() {
        this._locked = false;
        this._resolves = []
    }

    lock () {
        if(this._locked) {
            return new Promise((res, _) => {
                this._resolves.push(res);
            });
        } else {
            this._locked = true;
            return;
        }
    }

    unlock() {
        if(this._resolves.length === 0) {
            this._locked = false;
            return;
        }
        var res = this._resolves.shift();
        res();
    }
}
