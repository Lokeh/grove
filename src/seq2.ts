const conj_method = Symbol("conj_method");

const toSeq_method = Symbol("toSeq_method");

interface IConjable<X> {
  [conj_method](x: X): IConjable<X>;
}

interface ICollection<X> extends Iterable<X> {
  cons(x: X): ICollection<X>;
  empty(): ICollection<X>;
  count(): number;
  equiv(p: ICollection<X>): boolean;
}

interface ISeq<X> extends ICollection<X> {
  first(): X;
  rest(): ISeq<X>;
  next(): ISeq<X> | null;
  cons(x: X): ISeq<X>;
  isEmpty(): boolean;
}

interface ISeqable<X> {
  [toSeq_method](): ISeq<X>;
}

interface ICollection<X> extends ISeqable<X> {}

// interface ISeq<X> extends ISeqable<X> {}

const withMeta_method = Symbol("withMeta_method");

interface IMeta {
  meta(): any;
}

interface IWithMeta {
  [withMeta_method](meta: any): IMeta;
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

function isConjable<X>(o: any): o is IConjable<X> {
  return o && o[conj_method];
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

function conj<X>(coll: IConjable<X> | ICollection<X>, x: X) {
  if (isConjable(coll)) {
    return coll[conj_method](x);
  }
  return cons(x, coll);
}

class SeqIterator<X> implements Iterable<X> {
  private s: ISeq<X>;
  constructor(s: ISeq<X>) {
    this.s = s;
  }

  next() {
    if ((this.s = null)) {
      return {
        done: true,
        value: null
      };
    }
    let v = this.s.first();
    this.s = this.s.next();

    return {
      done: false,
      value: v
    };
  }

  [Symbol.iterator]() {
    return this;
  }
}

//
// PersistentList
//

interface IPersistentList<X> extends ISeq<X>, IMeta {}

class EmptyList<X> implements IPersistentList<X> {
  private _meta: any;
  constructor(meta?: any) {
    if (meta) this._meta = meta;
  }
  first(): X {
    return null;
  }
  rest() {
    return this;
  }
  next(): null {
    return null;
  }
  cons(x: X) {
    return new PersistentList(x);
  }
  isEmpty() {
    return true;
  }
  empty() {
    return this;
  }
  count() {
    return 0;
  }
  equiv(x: any) {
    return x instanceof EmptyList;
  }
  meta() {
    return this._meta;
  }
  [withMeta_method](meta: any) {
    return new EmptyList(meta);
  }
  [toSeq_method]() {
    return this;
  }
  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
  }
}

class PersistentList<X> implements IPersistentList<X>, IMeta {
  private _first: X;
  private _rest: IPersistentList<X>;
  private _count: number;
  private _meta?: any;

  constructor(first: X, rest?: IPersistentList<X>, count?: number, meta?: any) {
    this._first = first;
    if (rest && count) {
      this._rest = rest;
      this._count = count;
    } else if (rest || count) {
      throw new Error("Must pass in both rest AND count");
    } else {
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
      return null;
    }
    return this._rest;
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

  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
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

  first(): X {
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
    // TODO: verify this
    return this.first() === null && this._rest === null;
  }

  empty(): ISeq<X> {
    // return EMPTY_LIST as ISeq<X>;
    return new EmptyList() as IPersistentList<X>;
  }

  [toSeq_method]() {
    return this;
  }

  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
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
      return null;
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
    if (this.s === null) return null;
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
    return new EmptyList() as ISeq<X>;
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

  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
  }
}

//
// ArraySeq
//

class ArraySeq<X> implements ISeq<X>, IMeta {
  private array: Array<X>;
  private pointer: number;
  private _meta: any;
  constructor(array: Array<X>, pointer: number, meta?: any) {
    this.array = array;
    this.pointer = pointer;
    if (meta) this._meta = meta;
  }

  first() {
    return this.array[this.pointer];
  }

  next() {
    if (this.isEmpty()) {
      return null;
    }
    return new ArraySeq(this.array, this.pointer + 1, this._meta);
  }

  rest() {
    let n = this.next();
    if (n === null) new EmptyList() as ISeq<X>;
    return n;
  }

  cons(x: X): ISeq<X> {
    return new Cons(x, this);
  }

  isEmpty() {
    return this.pointer === this.array.length - 1;
  }

  empty() {
    return new ArraySeq(this.array, this.array.length - 1, this.meta());
  }

  count() {
    return this.array.length - this.pointer;
  }

  equiv(s: ISeq<X>) {
    let isEq = true;
    for (
      let hd = s.first(), tl = s.next(), ptr = 0;
      isEq && tl && ptr < this.array.length;
      hd = tl.first(), tl = tl.next(), ptr++
    ) {
      isEq = hd === this.array[ptr];
    }
    return isEq;
  }

  [toSeq_method]() {
    return this;
  }

  meta() {
    return this._meta;
  }

  [withMeta_method](meta: any) {
    return new ArraySeq(this.array, this.pointer, meta);
  }

  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
  }
}

//
// Extend native types
//

interface Array<T> extends IConjable<T>, ISeqable<T> {}

Array.prototype[conj_method] = function<X>(x: X) {
  this.push(x);
  return this;
};

Array.prototype[toSeq_method] = function() {
  return new ArraySeq(this, 0);
};

//
// Library
//

function first<X>(s: ISeqable<X>) {
  if (s) {
    return seq(s).first();
  }
  return null;
}

function ffirst<X>(s: ISeqable<ISeqable<X>>) {
  // trust me it's not empty
  return first(first(s) as ISeqable<X>);
}

function rest<X>(s: ISeqable<X>) {
  return seq(s).rest();
}

function count<X>(s: ISeqable<X>) {
  return seq(s).count();
}

function empty<X>(s: ISeq<X>) {
  return s.empty();
}

function reduce<X, Y>(f: (acc: Y, x: X) => Y, init: Y, s: ISeqable<X>): Y {
  let acc = init;

  for (let xs = seq(s), hd = xs.first(); xs !== null; xs = xs.next()) {
    hd = xs.first();
    acc = f(acc, hd);
  }

  return acc;
}

function into<X>(coll: IConjable<X> | ISeq<X>, s: ISeq<X>): IConjable<X> | ISeq<X> {
    return reduce((acc, x) => conj(acc, x), coll, s);
}

function map<X, Y>(f: (x: X) => Y, s: ISeqable<X>): ISeq<Y> {
    let xs = seq(s);
    if (xs === null) return null;
    return new LazySeq(null, () => cons(f(xs.first()), map(f, xs.rest())));
}

//
// Try it out
//

const arrSeq = seq([1, 2, 3]);
console.log("arrSeq", arrSeq, count(arrSeq));
console.log("first array", first([1, 2, 3]));
console.log("first arrSeq", first(arrSeq));
console.log("rest array", rest([1, 2, 3]), count(rest([1, 2, 3])));
console.log("rest arrSeq", rest(arrSeq), count(rest(arrSeq)));
console.log("first rest arrSeq", first(rest(arrSeq)));
console.log("reduce rest arrSeq", reduce((x, y) => x + y, 0, rest(arrSeq)));
console.log("into rest arrSeq", into([], rest(arrSeq)))
const mapArrSeq = map(x => x + 1, arrSeq);
console.log("map arrSeq", mapArrSeq);
console.log("seq map arrSeq", seq(mapArrSeq));
console.log("into map arrSeq", into([], mapArrSeq));
