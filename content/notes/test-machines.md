---
title: "TEST — State Machines Everywhere"
url: "/test-machines"
date: 2025-06-02T18:30:00+05:30
tldr: "A technical test note: code, a table, maths inline and in display."
tags: [test, computers, maths]
---

A turnstile is the textbook state machine: two states, two inputs.

## The table

| State    | Coin     | Push     |
|----------|----------|----------|
| Locked   | Unlocked | Locked   |
| Unlocked | Unlocked | Locked   |

## The code

```go
type State int

const (
	Locked State = iota
	Unlocked
)

func (s State) Next(coin bool) State {
	if coin {
		return Unlocked
	}
	return Locked
}
```

## The maths

With $n$ states and an alphabet $\Sigma$, the transition function is a map $\delta : Q \times \Sigma \to Q$, and there are

$$
|Q|^{|Q| \cdot |\Sigma|}
$$

of them.{{< sidenote >}}TEST NOTE. For the turnstile, $2^{4} = 16$.{{< /sidenote >}}

### A subsection

An h3, to check it stays in the text column in both heading styles.
