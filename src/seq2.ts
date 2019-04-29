const EMPTY_VALUE = Symbol("EMPTY");

type EMPTY = typeof EMPTY_VALUE;

const conj_method = Symbol("conj_method");

const toSeq_method = Symbol("toSeq_method");

interface ICollection<X> {
    cons(x: X): ICollection<X>
    empty(): ICollection<X>
    count(): number
    equiv(p: ICollection<X>): boolean
}

interface ISeq<X> extends ICollection<X> {
    first(): X | EMPTY
    rest(): ISeq<X>
    next(): ISeq<X> | null
    cons(x: X): ISeq<X>
    isEmpty(): boolean
};

interface ISeqable<X> {
    [toSeq_method](): ISeq<X>
}

interface ISeq<X> extends ISeqable<X> {}

const withMeta_method = Symbol("withMeta_method");

interface IMeta {
    meta(): any
}

interface IWithMeta {
    [ withMeta_method](meta: any): IMeta
}

interface IMeta extends IWithMeta {}




//
// Runtime
//

function isSeqable<X>(o: any): o is ISeqable<X> {
    return o && o[toSeq_method];
}

function isSeq<X>(o: any): o is ISeq<X> {
    return o && o.first && o.rest && o.cons && o.isEmpty;
}

function seq<X>(o: ISeqable<X> | null) {
    if (o) return o[toSeq_method]();
    return null;
}

function cons<X>(x: X, coll: ISeqable<X> | null): ISeq<X> {
    if (coll === null) {
        return new PersistentList(x);
    }
    return seq(coll).cons(x);
}




//
// PersistentList
//


interface IPersistentList<X> extends ISeq<X>, IMeta {};

class EmptyList<X> implements IPersistentList<X> {
    private _meta: any;
    constructor(meta?: any) {
        if (meta) this._meta = meta;
    }
    first(): EMPTY { return EMPTY_VALUE }
    rest() { return this }
    next(): null { return null }
    cons(x: X) { return new PersistentList(x) }
    isEmpty() { return true }
    empty() { return this }
    count() { return 0 }
    equiv(x: any) {
        return x instanceof EmptyList;
    }
    meta() { return this._meta }
    [ withMeta_method ](meta: any) { return new EmptyList(meta) }
    [toSeq_method]() { return this }
}

const EMPTY_LIST = new EmptyList();

class PersistentList<X> implements IPersistentList<X>, IMeta {
    private _first: X
    private _rest: IPersistentList<X>;
    private _count: number;
    private _meta?: any;

    constructor(first: X, rest?: IPersistentList<X>, count?: number, meta?: any) {
        this._first = first;
        if (rest && count) {
            this._rest = rest;
            this._count = count;
        } else if (rest || count) {
            throw new Error("Must pass in both rest AND count")
        } else
        {
            this._count = 1;
        }

        if (meta) this._meta = meta;
    }

    first(): X {
        return this._first;
    }

    rest() {
        return this._rest;
    }

    next() {
        if (this._count === 1) {
            return null
        }
        return this._rest
    }

    cons(x: X): IPersistentList<X> {
        return new PersistentList(x, this, this._count + 1, this.meta());
    }

    count() {
        return this._count;
    }

    equiv(pl: ISeq<X>) {
        return this.first() === pl.first() && this.rest().equiv(pl.rest());
    }

    meta() {
        return this._meta;
    }

    [withMeta_method](meta: any) {
        return new PersistentList(this._first, this._rest, this._count, meta);
    }

    isEmpty() {
        return false;
    }

    empty(): IPersistentList<X> {
        // return EMPTY_LIST as IPersistentList<X>;
        return new EmptyList() as IPersistentList<X>;
    }

    [toSeq_method]() {
        return this;
    }
}




//
// Cons
//

class Cons<X> implements ISeq<X>, IMeta {
    private _first: X;
    private _rest: ISeq<X>;
    private _meta?: any;

    constructor(first: X, rest: ISeq<X>, meta?: any) {
        this._first = first;
        this._rest = rest;

        if (meta) this._meta = meta;
    }

    first(): X | EMPTY {
        return this._first;
    }

    rest() {
        if (this._rest === null) {
            return new EmptyList() as ISeq<X>;
        }
        return this._rest;
    }

    next() {
        return this.rest()[toSeq_method]();
    }

    cons(x: X): ISeq<X> {
        return new PersistentList(x, this, this.meta());
    }

    equiv(pl: ISeq<X>) {
        return this.first() === pl.first() && this.rest().equiv(pl.rest());
    }

    meta() {
        return this._meta;
    }

    [withMeta_method](meta: any) {
        return new Cons(this._first, this._rest, meta);
    }

    count() {
        return 1 + this._rest.count();
    }

    isEmpty() {
        return this.first() === EMPTY_VALUE;
    }

    empty(): ISeq<X> {
        // return EMPTY_LIST as ISeq<X>;
        return new EmptyList() as IPersistentList<X>
    }

    [toSeq_method]() {
        return this;
    }

}



//
// LazySeq
//

class LazySeq<X> implements ISeq<X>, IMeta {
    private fn?: () => ISeq<X>;
    private s?: ISeq<X>;
    private x: any;
    private _meta?: any;

    constructor(s?: ISeq<X>, fn?: () => ISeq<X>, meta?: any) {
        if (s) {
            this.s = s;
        } else if (fn) {
            this.fn = fn;
        } else {
            throw new Error("Must provide either a sequence or a function");
        }

        if (meta) this._meta = meta;
    }

    private sval() {
        if (this.fn !== null) {
            this.x = this.fn();
            this.fn = null;
        }
        if (this.x !== null) {
            return this.x;
        }
        return this.s;
    }

    [toSeq_method]() {
        // review this
        this.sval();
        if (this.x !== null) {
            let ls = this.x;
            this.x = null;
            while (ls instanceof LazySeq) {
                ls = ls.sval();
            }
            this.s = ls[toSeq_method]();
        }
        return this.s;
    }

    first() {
        // realize seq
        this[toSeq_method]();
        if (this.s === null) {
            return null
        }
        return this.s.first();
    }

    rest() {
        this[toSeq_method]();
        if (this.s === null) {
            return new EmptyList() as ISeq<X>;
        }
        return this.s.rest();
    }

    next(): ISeq<X> | null {
        this[toSeq_method]();
        if (this.s === null) return null
        return this.s.next();
    }

    cons(x: X): ISeq<X> {
        return cons(x, this);
    }

    meta() {
        return this._meta;
    }

    [withMeta_method](meta: any) {
        return new LazySeq(this.s, this.fn, meta);
    }

    isEmpty() {
        return this[toSeq_method]() === null;
    }

    empty() {
        return new EmptyList();
    }

    count() {
        let c = 0;
        for (let s = this[toSeq_method](); s !== null; s = s.next()) {
            ++c;
        }

        return c;
    }

    equiv(o: ISeq<X>) {
        const s = this[toSeq_method]();
        if (s !== null) {
            return s.equiv(o);
        }
        return o[toSeq_method]() === null;
    }
}
