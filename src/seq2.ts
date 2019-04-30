const conj_method = Symbol("conj_method");

const toSeq_method = Symbol("toSeq_method");

interface IConjable<X> {
  [conj_method](x: X): IConjable<X>;
}

interface IPersistentCollection<X> extends Iterable<X> {
  cons(x: X): IPersistentCollection<X>;
  empty(): IPersistentCollection<X>;
  count(): number;
  equiv(p: IPersistentCollection<X>): boolean;
}

interface ISeq<X> extends IPersistentCollection<X> {
  first(): X;
  rest(): ISeq<X>;
  next(): ISeq<X> | null;
  cons(x: X): ISeq<X>;
  isEmpty(): boolean;
}

interface ISeqable<X> {
  [toSeq_method](): ISeq<X>;
}

interface IPersistentCollection<X> extends ISeqable<X> {}

const withMeta_method = Symbol("withMeta_method");

interface IMeta {
  meta(): any;
}

interface IWithMeta {
  [withMeta_method](meta: any): IMeta;
}

interface IMeta extends IWithMeta {}

//
// Allow for fluent extensions later...
//

class FluentCollection {};


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
    let s = seq(coll);
  if (s === null || s === undefined) {
    return new PersistentList(x);
  }
  return s.cons(x);
}

function conj<X>(coll: IConjable<X> | IPersistentCollection<X>, x: X) {
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
    if (this.s === null) {
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


abstract class ASeq<X> extends FluentCollection implements ISeq<X>, IMeta {
    private _meta: any;

    constructor(meta: any){
        super();
        this._meta = meta;
    }

    meta() {
        return this._meta;
    }

    abstract [withMeta_method](meta: any): ASeq<X>

    empty(): IPersistentCollection<X> {
        return new EmptyList() as IPersistentCollection<X>;
    }

    equiv(o: any) {
        if (!isSeq(o) || !isSeqable(o)) return false;
        const pl = seq(o) as ISeq<X>;
        return this.first() === pl.first() && this.rest().equiv(pl.rest());
    }

    [toSeq_method](): ISeq<X> {
        return this;
    }

    cons(x: X): ISeq<X> {
        return new Cons(x, this);
    }

    [Symbol.iterator](): SeqIterator<X> {
        return new SeqIterator(this);
    }

    rest(): ISeq<X> {
        let s = this.next();
        if (s) return s
        return new EmptyList();
    };

    abstract first(): X;
    abstract next(): ISeq<X> | null;
    abstract isEmpty(): boolean;
    abstract count(): number;
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
    [toSeq_method](): ISeq<X> {
      // v important
    return null;
  }
  [Symbol.iterator](): SeqIterator<X> {
    return new SeqIterator(this);
  }
}

class PersistentList<X> extends ASeq<X> implements IPersistentList<X>, IMeta {
  private _first: X;
  private _rest: IPersistentList<X>;
  private _count: number;

  constructor(first: X, rest?: IPersistentList<X>, count?: number, meta?: any) {
      super(meta);
    this._first = first;
    if (rest && count) {
      this._rest = rest;
      this._count = count;
    } else if (rest || count) {
      throw new Error("Must pass in both rest AND count");
    } else {
      this._count = 1;
    }
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

class Cons<X> extends ASeq<X> implements ISeq<X>, IMeta {
  private _first: X;
  private _rest: ISeq<X>;

  constructor(first: X, rest: ISeq<X>, meta?: any) {
      super(meta);
    this._first = first;
    this._rest = rest;
  }

  first(): X {
    return this._first;
  }

  next() {
    return this.rest()[toSeq_method]();
  }

    rest(): ISeq<X> {
      if (this._rest === null) {
          return new EmptyList();
      }

      return this._rest;
  }

  cons(x: X): ISeq<X> {
    return new PersistentList(x, this, this.meta());
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
}

//
// LazySeq
//

class LazySeq<X> extends ASeq<X> implements ISeq<X>, IMeta {
  private fn?: () => ISeq<X>;
  private s?: ISeq<X>;
  private sv: any;

  constructor(s?: ISeq<X>, fn?: () => ISeq<X>, meta?: any) {
      super(meta);
    if (s) {
      this.s = s;
    } else if (fn) {
      this.fn = fn;
    } else {
      throw new Error("Must provide either a sequence or a function");
    }
  }

  private sval() {
    if (this.fn !== null) {
      this.sv = this.fn();
      this.fn = null;
    }
    if (this.sv !== null) {
      return this.sv;
    }
    return this.s;
  }

    [toSeq_method](): ISeq<X> {
    // review this
    this.sval();
    if (this.sv !== null) {
      let ls = this.sv;
      this.sv = null;
      while (ls instanceof LazySeq) {
        ls = ls.sval();
     }
      this.s = seq(ls);
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

  next(): ISeq<X> | null {
    this[toSeq_method]();
    if (this.s === null) return null;
    return this.s.next();
  }

  [withMeta_method](meta: any) {
    return new LazySeq(this.s, this.fn, meta);
  }

  isEmpty() {
    return this[toSeq_method]() === null;
  }

  count() {
    let c = 0;
    for (let s = this[toSeq_method](); s !== null; s = s.next()) {
      ++c;
    }

    return c;
  }
}

//
// ArraySeq
//

class ArraySeq<X> extends ASeq<X> implements ISeq<X>, IMeta {
  private array: Array<X>;
  private pointer: number;
  constructor(array: Array<X>, pointer: number, meta?: any) {
      super(meta);
    this.array = array;
    this.pointer = pointer;
  }

  first() {
    return this.array[this.pointer];
  }

  next() {
    if (this.isEmpty()) {
      return null;
    }
      return new ArraySeq(this.array, this.pointer + 1, this.meta());
  }

  isEmpty() {
    return this.pointer === this.array.length - 1;
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

  [withMeta_method](meta: any) {
    return new ArraySeq(this.array, this.pointer, meta);
  }
}


//
// Iterate
//

const UNREALIZED_SEED = Symbol("UNREALIZED_ITERATE_SEED"); 

class Iterate<X> extends ASeq<X> implements IMeta {
    private seed: X | typeof UNREALIZED_SEED;
    private prevSeed: X;
    private _next: ISeq<X>
    private fn: (x: X) => X;
    constructor(fn: (x: X) => X, seed: X | typeof UNREALIZED_SEED, prevSeed?: X, next?: ISeq<X>, meta?: any) {
        super(meta);
        this.fn = fn;
        this.seed = seed;
        this.prevSeed = prevSeed;
        this._next = next;
    }

    first() {
        if (this.seed === UNREALIZED_SEED) {
            this.seed = this.fn(this.prevSeed)
        }
        return this.seed as X;
    }

    next() {
        if (!this._next) {
            this._next = new Iterate(this.fn, UNREALIZED_SEED, this.first())
        }
        return this._next;
    }

    [withMeta_method](meta: any) {
        return new Iterate(this.fn, this.seed, this.prevSeed, this._next, meta);
    }

    count(): number {
        throw new Error("Called count on an infinite sequence!");
    }

    isEmpty(): boolean {
        return false
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

function into<X>(
  coll: IConjable<X> | ISeq<X>,
  s: ISeq<X>
): IConjable<X> | ISeq<X> {
  return reduce((acc, x) => conj(acc, x), coll, s);
}

function map<X, Y>(f: (x: X) => Y, s: ISeqable<X>): ISeq<Y> {
  let xs = seq(s);
  if (xs === null) return null;
  return new LazySeq(null, () => cons(f(xs.first()), map(f, xs.rest())));
}

function filter<X>(pred: (x: X) => boolean, s: ISeqable<X>): ISeq<X> {
  let xs = seq(s);
  if (xs === null) return null;
  return new LazySeq(null, () => {
    let hd = xs.first();
    let tl = xs.rest();
    if (pred(hd)) {
      return cons(hd, filter(pred, tl));
    }
    return filter(pred, tl);
  });
}

function take<X>(n: number, coll: ISeqable<X>): LazySeq<X> {
    return new LazySeq(null, function takeFn () {
        if (n > 0) {
            let s = isSeq(coll) ? coll as ISeq<X> : seq(coll);
            if (s) {
                let hd = s.first();
                let tl =  s.rest();
                let ret = new Cons(hd, take(n - 1, tl));
                return ret;
            }
            return null
        }
    })
}

function iterate<X>(f: (x: X) => X, x: X): ISeq<X> {
    return new Iterate(f, x, null);
}

// function range(begin: number, end?: number): LazySeq<number> {
    
// }

//
// Try it out
//

const arrSeq = seq([1, 2, 3, 4, 5]);
console.log("arrSeq", arrSeq, count(arrSeq));
console.log("first array", first([1, 2, 3]));
console.log("first arrSeq", first(arrSeq));
console.log("rest array", rest([1, 2, 3]), count(rest([1, 2, 3])));
console.log("rest arrSeq", rest(arrSeq), count(rest(arrSeq)));
console.log("first rest arrSeq", first(rest(arrSeq)));
console.log("reduce rest arrSeq", reduce((x, y) => x + y, 0, rest(arrSeq)));
console.log("into rest arrSeq", into([], rest(arrSeq)));

console.log("emptyList", new EmptyList());

console.log("emptyList", seq(new EmptyList()));


const mapArrSeq = map(x => x + 1, arrSeq);
// console.log("map arrSeq", mapArrSeq);
// console.log("seq map arrSeq", seq(mapArrSeq));
console.log("into map arrSeq", into([], mapArrSeq));

const filterArrSeq = filter(x =>  x % 2 === 0, [1, 2, 3, 4, 5]);
// console.log("filter arrSeq", filterArrSeq);
// console.log("seq filter arrSeq", seq(filterArrSeq));
console.log("into filter arrSeq", into([], filterArrSeq));


const takeArrSeq = take(3, [1, 2, 3, 4, 5, 6, 7]);
console.log("take arrSeq", into([], takeArrSeq))
console.log("take map array", into([], take(3, map(x => x * 2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))))

const naturals = iterate(x => x + 1, 0);
// console.log("naturals", naturals);
console.log("take naturals", into([], take(5, naturals)));
console.log("take map naturals", into([], map(x => x * 2, take(5, naturals))))

console.log("iterator")
for (let n of map(x => x * 2, take(10, naturals))) {
    console.log(n);
}
