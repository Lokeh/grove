// import * as s from "./seq2";

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



//
// Library
//

function sequence<X>(coll: ISeqable<X>): ISeq<X> {
    if (isSeq(coll)) {
        return coll as ISeq<X>;
    }
    return seq(coll) || emptyList();
}

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

function next<X>(s: ISeqable<X>) {
    return seq(s).next();
}

function count<X>(s: ISeqable<X>) {
  return seq(s).count();
}

function empty<X>(s: ISeq<X>) {
  return s.empty();
}

function isEvery<X>(pred: (x :X) => boolean, coll: ISeqable<X>): boolean {
    if (seq(coll) === null) {
        return true;
    }
    if (pred(first(coll))) {
        isEvery(pred, next(coll));
    }
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

function lazySeq<X>(f: () => ISeq<X> | null): LazySeq<X> {
    return new LazySeq(null, f);
}

function map<X, Y>(f: (x: X) => Y, s: ISeqable<X>): ISeq<Y> {
  let xs = seq(s);
  if (xs === null) return null;
  return lazySeq(() => cons(f(xs.first()), map(f, xs.rest())));
}

function filter<X>(pred: (x: X) => boolean, s: ISeqable<X>): ISeq<X> {
  let xs = seq(s);
  if (xs === null) return null;
  return lazySeq(() => {
    let hd = xs.first();
    let tl = xs.rest();
    if (pred(hd)) {
      return cons(hd, filter(pred, tl));
    }
    return filter(pred, tl);
  });
}

function take<X>(n: number, coll: ISeqable<X>): LazySeq<X> {
    return lazySeq(() => {
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
