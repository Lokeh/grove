import * as S from "./seq2";

export import Iterate = S.Iterate;
export import ISeqable = S.ISeqable;
export import ISeq = S.ISeq;


//
// Extend native types
//

export function cons<X>(x: X, coll: S.ISeqable<X> | null): S.ISeq<X> {
  let s = S.seq(coll);
  if (s === null || s === undefined) {
    return new S.PersistentList(x);
  }
  return s.cons(x);
}

export function conj<X>(
  coll: S.IConjable<X> | S.IPersistentCollection<X>,
  x: X
) {
  if (S.isConjable(coll)) {
    return coll[S.conj_method](x);
  }
  return cons(x, coll);
}

//
// Library
//

export const seq = S.seq;

export const isSeq = S.isSeq;

export const isSeqable = S.isSeqable;

export const isConjable = S.isConjable;

export function comp<X>(fn1: (a: any) => X, ...fns: Array<(a: any) => any>) {
  return fns.reduce((prevFn, nextFn) => value => prevFn(nextFn(value)), fn1);
}

export function not<X>(x: X): boolean {
    return !!x;
}

export function first<X>(s: S.ISeqable<X>) {
  if (s) {
    return S.seq(s).first();
  }
  return null;
}

export function ffirst<X>(s: S.ISeqable<S.ISeqable<X>>) {
  // trust me it's not empty
  return first(first(s) as S.ISeqable<X>);
}

export function rest<X>(s: S.ISeqable<X>) {
  return S.seq(s).rest();
}

export function next<X>(s: S.ISeqable<X>) {
  return S.seq(s).next();
}

export function count<X>(s: S.ISeqable<X>) {
  return S.seq(s).count();
}

export function empty<X>(s: S.ISeq<X>) {
  return s.empty();
}

export function reduce<X, Y>(
  f: (acc: Y, x: X) => Y,
  init: Y,
  s: S.ISeqable<X>
): Y {
  let acc = init;

  for (let xs = S.seq(s), hd = xs.first(); xs !== null; xs = xs.next()) {
    hd = xs.first();
    acc = f(acc, hd);
  }

  return acc;
}

export function into<X>(
  coll: S.IConjable<X> | S.ISeq<X>,
  s: S.ISeq<X>
): S.IConjable<X> | S.ISeq<X> {
  return reduce((acc, x) => conj(acc, x), coll, s);
}

export function lazySeq<X>(f: () => S.ISeq<X> | null): S.LazySeq<X> {
  return new S.LazySeq(null, f);
}


export function concat<X>(x: ISeqable<X>, ...xs: ISeqable<X>[]): S.LazySeq<X> {
    if (xs.length === 1) {
        return lazySeq(() => {
            let s = seq(x);
            if (s) {
                console.log(xs[0])
                return cons(first(s), concat(rest(s), xs[0]))
            } else {
                return seq(xs[0]);
            }
        });
    }
    if (xs.length) {
        function cat(xys: ISeqable<X>, zs: ISeqable<X>[]): S.LazySeq<X> {
            return lazySeq(() => {
                let xysSeq = seq(xys);
                if (xysSeq) {
                    return cons(first(xysSeq), cat(rest(xysSeq), zs))
                } else {
                    if (zs) {
                        let [zsHd, ...zsTl] = zs;
                        return cat(zsHd, zsTl);
                    }
                }
            })
        }
        return cat(concat(x, xs[0]), xs);
    }
    if (x) {
        return new S.LazySeq(seq(x));
    }
    return lazySeq(() => null);
}

export function sequence<X>(coll: S.ISeqable<X>): S.ISeq<X> {
    if (S.isSeq(coll)) {
        return coll as S.ISeq<X>;
    }
    return S.seq(coll) || S.emptyList();
}

export function isEvery<X>(
    pred: (x: X) => boolean,
    coll: S.ISeqable<X>
): boolean {
    if (S.seq(coll) === null) {
        return true;
    }
    if (pred(first(coll))) {
        isEvery(pred, next(coll));
    }
}

export function isNotEvery<X>(pred: (x: X) => boolean, coll: S.ISeqable<X>) {
    return not(isEvery(pred, coll));
}

export function some<X>(f: (x: X) => X, coll: S.ISeqable<X>): X | null {
    if (seq(coll)) {
        return f(first(coll)) || some(f, next(coll))
    }
    return null;
}

export function isNotAny<X>(f: (x: X) => X, coll: S.ISeqable<X>): boolean {
    return not(some(f, coll));
}


export function map<X, Y>(f: (x: X) => Y, s: S.ISeqable<X>): S.ISeq<Y> {
  let xs = S.seq(s);
  if (xs === null) return null;
  return lazySeq(() => cons(f(xs.first()), map(f, xs.rest())));
}

export function mapCat<X, Y>(f: (x: X) => S.ISeqable<Y>, s: S.ISeqable<X>): S.ISeq<Y> {
    return concat.apply(null, map(f, s));
}

export function filter<X>(
  pred: (x: X) => boolean,
  s: S.ISeqable<X>
): S.ISeq<X> {
  let xs = S.seq(s);
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

export function take<X>(n: number, coll: S.ISeqable<X>): S.LazySeq<X> {
  return lazySeq(() => {
    if (n > 0) {
      let s = S.isSeq(coll) ? (coll as S.ISeq<X>) : S.seq(coll);
      if (s) {
        let hd = s.first();
        let tl = s.rest();
        let ret = new S.Cons(hd, take(n - 1, tl));
        return ret;
      }
      return null;
    }
  });
}

export function iterate<X>(f: (x: X) => X, x: X): S.ISeq<X> {
  return new S.Iterate(f, x, null);
}

// function range(begin: number, end?: number): S.LazySeq<number> {

// }

//
// Try it out
//

const arrSeq = S.seq([1, 2, 3, 4, 5]);
console.log("arrSeq", arrSeq, count(arrSeq));
console.log("first array", first([1, 2, 3]));
console.log("first arrSeq", first(arrSeq));
console.log("rest array", rest([1, 2, 3]), count(rest([1, 2, 3])));
console.log("rest arrSeq", rest(arrSeq), count(rest(arrSeq)));
console.log("first rest arrSeq", first(rest(arrSeq)));
console.log("reduce rest arrSeq", reduce((x, y) => x + y, 0, rest(arrSeq)));
console.log("into rest arrSeq", into([], rest(arrSeq)));

console.log("emptyList", new S.EmptyList());

console.log("emptyList", S.seq(new S.EmptyList()));

const mapArrSeq = map(x => x + 1, arrSeq);
// console.log("map arrSeq", mapArrSeq);
// console.log("seq map arrSeq", seq(mapArrSeq));
console.log("into map arrSeq", into([], mapArrSeq));

const filterArrSeq = filter(x => x % 2 === 0, [1, 2, 3, 4, 5]);
// console.log("filter arrSeq", filterArrSeq);
// console.log("seq filter arrSeq", seq(filterArrSeq));
console.log("into filter arrSeq", into([], filterArrSeq));

const takeArrSeq = take(3, [1, 2, 3, 4, 5, 6, 7]);
console.log("take arrSeq", into([], takeArrSeq));
console.log(
  "take map array",
  into([], take(3, map(x => x * 2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])))
);

const naturals = iterate(x => x + 1, 0);
// console.log("naturals", naturals);
console.log("take naturals", into([], take(5, naturals)));
console.log("take map naturals", into([], map(x => x * 2, take(5, naturals))));

console.log("iterator");
for (let n of map(x => x * 2, take(10, naturals))) {
  console.log(n);
}

console.log("concat", into([], concat([1, 2, 3], [4, 5, 6])));
