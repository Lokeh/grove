// //
// // Types
// //

// const EMPTY_VALUE = Symbol("SEQ_EMPTY_VALUE");

// const _toSeq = Symbol("toSeq");

// const _conj = Symbol("conj");

// const _first = Symbol("_first");

// const _rest = Symbol("_rest");

// // const _cons = Symbol("_cons");

// const _empty = Symbol("empty");

// const _isEmpty = Symbol("isEmpty");

// type SeqValue<X> = X | typeof EMPTY_VALUE;

// interface ISeq<X> extends Iterable<X> {
//   [ _first ](): SeqValue<X>;
//   [ _rest ](): ISeq<X>;
//   // [ _cons ](x: X): ISeq<X>;
// }

// interface ISeqable<X> {
//   [_toSeq](): ISeq<X>;
// }

// interface IConjable<X> {
//   [_conj](x: X): IConjable<X>;
// }

// interface IEmptyable<X> {
//   [_empty](): ISeqable<X>;
//     [_isEmpty](): boolean;
// }

// interface ISeqable<X> extends IEmptyable<X>, IConjable<X> {};

// interface ISeq<X> extends ISeqable<X>, IConjable<X> {}


// class SeqIterator<X> implements Iterator<X> {
//     private seq: ISeq<X>;
//     constructor(seq: ISeq<X>) {
//         this.seq = seq;
//     }

//     next() {
//         let v = this.seq[ _first ]();
//         if (v === EMPTY_VALUE) {
//             return {
//                 done: true,
//                 value: null
//             };
//         }
//         this.seq = this.seq[ _rest ]();
//         return { done: false, value: v };
//     }

//     [Symbol.iterator]() {
//         return this;
//     }
// }

// // Base implementation of an empty seq
// // class EmptySeq<X> implements ISeq<X> {
// //     [ _first ]() {
// //         return EMPTY_VALUE as SeqValue<X>;
// //     }

// //     [ _rest ]() {
// //         return this;
// //     }

// //     [_conj](_: X) {
// //         return this;
// //     }

// //     [_empty]() {
// //         return this;
// //     }

// //     [Symbol.iterator](): Iterator<X> {
// //         return new SeqIterator(this);
// //     }

// //     [_toSeq]() {
// //         return this;
// //     }
// // }

// class Cons<X> implements ISeq<X> {
//     private head : X;
//     private tail : ISeq<X> | null;

//     constructor(head: X, tail: ISeq<X> | null) {
//         this.head = head;
//         this.tail = tail;
//     }

//     [ _first ]() {
//         return this.head;
//     }

//     [ _rest ]() {
//         return this.tail;
//     }

//     [ _conj ](x: X): Cons<X> {
//         return new Cons(x, this);
//     }

//     [ _empty ]() {
//         return new Cons(null, null)
//     }

//     [_isEmpty]() {
//         return this.head === null && this.tail === null;
//     }

//     [Symbol.iterator](): SeqIterator<X> {
//         return new SeqIterator(this);
//     }

//     [_toSeq]() {
//         return this;
//     }
// }




// // Helper function for empty seq
// const emptySeq = new Cons(null, null);


// //
// // Library
// //

// function seq<X>(x: ISeqable<X>): ISeq<X> {
//   return x[_toSeq]();
// }

// function empty<X>(s: IEmptyable<X>): ISeqable<X> {
//   return s[_empty]();
// }

// function cons<X>( x: X, s: ISeqable<X>) {
//     return new Cons(x, seq(s));
// }

// function conj<X>(s: IConjable<X>, x: X) {
//   return s[_conj](x);
// }

// function first<X>(s: ISeqable<X>) {
//   let v = seq(s)[ _first ]();
//   if (v === EMPTY_VALUE) {
//     return null;
//   } else {
//     return v;
//   }
// }

// function ffirst<X>(s: ISeqable<ISeqable<X>>) {
//   return first(first(s));
// }

// function rest<X>(s: ISeqable<X>) {
//   return seq(s)[ _rest ]();
// }

// function reduce<X, Y>(f: (acc: Y, x: X) => Y, init: Y, s: ISeqable<X>): Y {
//   let xs = seq(s);
//   let acc = init;
//   let x = xs[ _first ]();
//   while (x !== EMPTY_VALUE) {
//     acc = f(acc, x);
//     xs = xs[ _rest ]();
//     x = xs[ _first ]();
//   }

//   return acc;
// }

// function into<X>(acc: IConjable<X>, s: ISeq<X>) {
//   return reduce(conj, acc, s);
// }

// function map<X, Y>(f: (x: X) => Y, s: ISeqable<X>): ISeq<Y> {
//     return reduce((acc: ISeq<Y>, x) => conj(acc, f(x)), emptySeq, s) as ISeq<Y>;
// }

// //
// // Implementations
// //

// class ArraySeq<X> implements ISeq<X> {
//   private array: Array<X>;
//   private pointer: number;
//   constructor(array: Array<X>, pointer: number) {
//     this.array = array;
//     this.pointer = pointer;
//   }

//   [ _first ]() {
//     if (this.pointer === this.array.length) {
//       return EMPTY_VALUE;
//     }
//     return this.array[this.pointer];
//   }

//   [ _rest ](): ISeq<X> {
//     if (this.pointer === this.array.length) {
//       return this;
//     }
//     return new ArraySeq(this.array, this.pointer + 1);
//   }

//   // [ _cons ](x: X) {
//   //   // this could be optimized to not copy
//   //   return new ArraySeq([x, ...this.array.slice(this.pointer)], 0);
//   // }

//   [_conj](x: X) {
//       return new ArraySeq([...this.array, x], this.pointer);
//   }

//   [_empty]() {
//     return new ArraySeq([], 0);
//   }

//     [_isEmpty]() {
//       return this.pointer !== this.array.length - 1;
//   }

//     [_toSeq]() {
//       return this;
//   }


//   [Symbol.iterator](): Iterator<X> {
//     return new SeqIterator(this);
//   }

// }

// class LazySeq<X> implements ISeq<X> {
//   private genFn: (x: X) => SeqValue<X>;
//   private realized: SeqValue<X>[];
//   constructor(genFn: (x: X) => SeqValue<X>, ...realized: SeqValue<X>[]) {
//     this.genFn = genFn;
//     this.realized = realized;
//   }

//     [ _first ](): SeqValue<X> {
//     return this.realized[0];
//   }

//   [ _rest ](): LazySeq<X> {
//       if (this.realized[0] === EMPTY_VALUE) {
//           return this
//       }
//     if (this.realized.length === 1) {
//         return new LazySeq(this.genFn, this.genFn(this.realized[0] as X));
//     }
//     return new LazySeq(this.genFn, ...this.realized.slice(1));
//   }

//   [ _conj ](x: X) {
//     return new LazySeq(this.genFn, x, ...this.realized);
//   }

//   // [_conj](x: X) {
//   //   return this[ _cons ](x);
//   // }

//   [_empty](): ISeq<X> {
//       return new Cons(null, null);
//   }

//     [_isEmpty]() {
//       return this[_first]() === EMPTY_VALUE;
//   }

//   [Symbol.iterator](): Iterator<X> {
//     return new SeqIterator(this);
//   }

//   [_toSeq]() {
//     return this;
//   }
// }

// //
// // Extending native types
// //

// interface Array<T> extends ISeqable<T>, IConjable<T>, IEmptyable<T> {}

// Array.prototype[_toSeq] = function() {
//   return new ArraySeq(this, 0);
// };

// Array.prototype[_empty] = function () {
//     return [...this];
// }

// Array.prototype[_conj] = function(x) {
//   let newArr = [...this];
//   newArr.push(x);
//   return newArr;
// };

// //
// // Tests + Examples
// //

// console.log("==== ArraySeq ====");

// let arrSeq = seq([1, 2, 3]);

// console.log("arrSeq", arrSeq);
// console.log("first arrSeq", first(arrSeq));
// console.log("rest arrSeq", rest(arrSeq));
// console.log("first rest arrSeq", first(rest(arrSeq)));

// for (let n of arrSeq) {
//   console.log("iterator", n);
// }

// console.log("conj", conj([1, 2, 3], 4));

// console.log("reduce array", reduce((x, y) => x + y, 0, [1, 2, 3]));

// console.log("map array", map(x => x + 1, [1, 2, 3]))

// // console.log("==== LazySeq ====");

// // let lazySeq = new LazySeq(x => x + 1, 0);

// // console.log("lazySeq", lazySeq);
// // console.log("lazySeq first", first(lazySeq));
// // console.log("lazySeq rest", rest(lazySeq));
// // console.log("lazySeq first rest", first(rest(lazySeq)));

// // let xs: ISeq<number> = lazySeq;
// // let x = first(lazySeq);
// // while (x < 10) {
// //   console.log("while", x);
// //   xs = rest(xs);
// //   x = first(xs);
// // }
