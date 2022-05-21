let graphs;
let EDGES, NODES, FRAGS, DISTMAT;
let filename = 'complete_symmetric_non-euclidean.json';

// Initial tour creation
const primaries = [
  {
    code: 'multiFrag',
    function: multiFrag,
  },
  {
    code: 'nearestN',
    function: nearestNeighbour,
  },
  {
    code: 'doubleENN',
    function: doubleEndedNN,
  },
];

// Optimisation algorithms
const secondaries = [
  {
    code: '2Opt',
    function: twoOpt,
  },
  {
    code: '3Opt',
    function: threeOpt,
  },
  {
    code: 'nodeSwap',
    function: nodeSwap,
  },
];

async function loadGraphs() {
  // Get graph data from JSON file
  const response = await fetch(`../graphs/${filename}`);
  graphs = await response.json();
  displayScores();
}
loadGraphs();

function displayScores() {
  const container = document.getElementById('graphScores');
  container.innerHTML = '';
  // Loop through every size graph
  for (let i = 0; i < graphs.length; i++) {
    const nodeDetail = document.createElement('details');
    const nodeSum = document.createElement('summary');
    nodeSum.innerText = `${graphs[i].nodes} nodes`;
    nodeDetail.appendChild(nodeSum);
    // Loop through each variant of this size
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      const graphDetail = document.createElement('details');
      const graphSum = document.createElement('summary');
      graphSum.innerText = `Graph ${j + 1}`;
      graphDetail.appendChild(graphSum);
      // Loop through each attempt on this variant
      for (let k = 0; k < graphs[i].graphs[j].attempts.length; k++) {
        const attemptContainer = document.createElement('section');
        attemptContainer.classList.add('attempt-container');
        attemptContainer.textContent = `${graphs[i].graphs[j].attempts[k].weight.toFixed(2)} : ${graphs[i].graphs[j].attempts[k].algorithm}`;
        graphDetail.appendChild(attemptContainer);
      }
      nodeDetail.appendChild(graphDetail);
    }
    container.appendChild(nodeDetail);
  }
}


function getEdges() {
  EDGES = [];
  NODES = [];
  for (let i = 0; i < DISTMAT.length; i++) {
    NODES.push(i);
    for (let j = i + 1; j < DISTMAT.length; j++) {
      EDGES.push({ a: i, b: j });
    }
  }
  EDGES.sort(edgeSort);
}

// Sort edges in ascending weight order.
function edgeSort(a, b) {
  const aLength = DISTMAT[a.a][a.b];
  const bLength = DISTMAT[b.a][b.b];
  return aLength - bLength;
}


/*
    Initial tour finding algorithms (Primaries)
*/

// Sort fragments in descending length order.
function fragSort(a, b) {
  return b.length - a.length;
}

async function multiFrag() {
  console.log('Here');
  getEdges();
  FRAGS = [];
  while (EDGES.length > 0) {
    // Get next shortest edge
    const edge = EDGES.shift();
    // if (EDGES.length % 10000 === 0) {
    //   console.log(EDGES.length);
    // }

    if (FRAGS.length === 0) {
      FRAGS.push([edge.a, edge.b]);
    }

    // Check if either node appears in any fragment
    if (anyFragContains(edge)) {
      continue;
    }

    // Add edge to existing fragment or create new
    if (!addEdge(edge)) {
      continue;
    }

    // Sort frags in descending order by length
    await FRAGS.sort(fragSort);
    // Check if longest frag is full tour
    if (FRAGS[0].length === NODES.length) {
      return FRAGS[0];
    }

    // Check if fragments can be connected
    for (let i = FRAGS.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const [a, b] = joinFragments(FRAGS[i], FRAGS[j]);
        if (a) {
          [FRAGS[i], FRAGS[j]] = [a, b];
        }
      }
    }
    // Remove any empty fragments
    FRAGS = FRAGS.filter(frag => frag.length > 0);
  }
}

function anyFragContains(edge) {
  for (const fragment of FRAGS) {
    const end = fragment.length - 1;
    // Check if first node appears in fragment
    let position = fragment.indexOf(edge.a, 1);
    if (position < end && position !== -1) {
      return true;
    }
    // Check if second node appears in fragment
    position = fragment.indexOf(edge.b, 1);
    if (position < end && position !== -1) {
      return true;
    }
  }
  // If not found in any fragment, return false
  return false;
}

function addEdge(edge) {
  //
  for (const fragment of FRAGS) {
    const end = fragment.length - 1;
    // Check if any fragment ends with either node
    const startA = fragment[0] === edge.a;
    const startB = fragment[0] === edge.b;
    const endA = fragment[end] === edge.a;
    const endB = fragment[end] === edge.b;

    // If adding edge would form a loop, return false
    if ((startA && endB) || (startB && endA)) {
      return false;
    }

    if (startA) {
      // If 'a' matches start of fragment, unshift 'b' onto fragment
      fragment.unshift(edge.b);
      return true;
    } else if (startB) {
      // If 'b' matches start of fragment, unshift 'a' onto fragment
      fragment.unshift(edge.a);
      return true;
    } else if (endA) {
      // If 'a' matches end of fragment, push 'b' onto fragment
      fragment.push(edge.b);
      return true;
    } else if (endB) {
      // If 'b' matches end of fragment, push 'a' onto fragment
      fragment.push(edge.a);
      return true;
    }
  }

  // If can't join any fragment, create new fragment
  FRAGS.push([edge.a, edge.b]);
  return true;
}

function joinFragments(a, b) {
  //
  const aEnd = a.length - 1;
  const bEnd = b.length - 1;
  const startAstartB = a[0] === b[0];
  const startAendB = a[0] === b[bEnd];
  const endAstartB = a[aEnd] === b[0];
  const endAendB = a[aEnd] === b[bEnd];

  if (startAstartB) {
    // If starts match, reverse B and concat A on end
    b.reverse();
    b.pop();
    a = b.concat(a);
    b = [];
    return [a, b];
  } else if (startAendB) {
    // If startA matches endB, concat A on end of B
    b.pop();
    a = b.concat(a);
    b = [];
    return [a, b];
  } else if (endAstartB) {
    // If endA matches startB, concat B on end of A
    a.pop();
    a = a.concat(b);
    b = [];
    return [a, b];
  } else if (endAendB) {
    // If ends match, reverse B and concat to end of A
    b.reverse();
    a.pop();
    a = a.concat(b);
    b = [];
    return [a, b];
  }

  // If no matches, return false
  return [false, false];
}

function getFragWeight(frag) {
  let total = 0;
  for (let curr = 0; curr < frag.length; curr++) {
    let next = curr + 1;
    if (next === frag.length) {
      next = 0;
    }
    const nodeA = frag[curr];
    const nodeB = frag[next];
    const weight = DISTMAT[nodeA][nodeB];
    total += weight;
  }
  return total;
}


function nearestNeighbour() {
  getEdges();
  // Start is arbitrary, begin at 0
  TOUR = [0];

  // Loop until full tour created
  while (TOUR.length !== NODES.length) {
    const tail = TOUR[0];
    const next = getClosest(tail, TOUR);
    TOUR.unshift(next);
  }

  FRAGS = [TOUR];
}

function doubleEndedNN() {
  getEdges();
  TOUR = [0];
  let front = true;
  while (TOUR.length !== NODES.length) {
    if (front) {
      const next = getClosest(TOUR[0], TOUR);
      TOUR.unshift(next);
      front = false;
      continue;
    }
    const tail = TOUR[TOUR.length - 1];
    const next = getClosest(tail, TOUR);
    TOUR.push(next);
    front = true;
  }

  FRAGS = [TOUR];
}

function getClosest(n, exclude) {
  let closest;
  let bestDist = Infinity;
  for (let i = 0; i < NODES.length; i++) {
    if (exclude.includes(i)) {
      continue;
    }
    const thisDist = DISTMAT[NODES[n]][NODES[i]];
    if (thisDist < bestDist) {
      bestDist = thisDist;
      closest = i;
    }
  }
  return closest;
}

/*
    Optimisation algorithms (Secondaries)
*/

function twoOpt() {
  let best = getFragWeight(TOUR);
  let hasChanged = false;

  /*
    Take the overall tour, break into two subtours, then reconnect in different ways:

    AB -> AB'

    Repeat until local minimum
  */

  twoOptMainLoop:
  for (let i = 1; i <= TOUR.length - 2; i++) {
    for (let j = i + 2; j <= TOUR.length; j++) {
      if (j === TOUR.length && i === 1) continue;

      // Separate into two sub-tours
      let x = [...TOUR];
      let b = x.splice(j);
      let a = x.splice(i);
      b = b.concat(x);
      let b_ = [...b].reverse();

      const p1 = a.concat(b_);

      const p1Weight = getFragWeight(p1);

      if (p1Weight < best) {
        best = p1Weight;
        TOUR = p1;
        hasChanged = true;
      }

      // If change was made, return to start. Keep looping until local minimum found
      if (hasChanged) {
        hasChanged = false;
        continue twoOptMainLoop;
      }
    }
  }
}

function threeOpt() {
  let best = getFragWeight(TOUR);
  let hasChanged = false;
  /*
    Take the overall tour, break into three subtours, then reconnect in different ways:

    ABC -> ABC'/AB'C/AB'C'/A'BC/A'BC'/A'B'C/A'B'C'

    Repeat until local minimum
  */
  threeOptMainLoop:
  for (let i = 1; i <= TOUR.length - 4; i++) {
    for (let j = i + 2; j <= TOUR.length - 2; j++) {
      for (let k = j + 2; k <= TOUR.length; k++) {
        if (k === TOUR.length && i === 1) continue;

        // Separate tour into three subtours
        let x = [...TOUR];
        // Initial subtours
        let c = x.splice(k);
        let b = x.splice(j);
        let a = x.splice(i);
        c = c.concat(x);
        // Reversed subtours
        let a_ = [...a].reverse();
        let b_ = [...b].reverse();
        let c_ = [...c].reverse();

        // Combine back into new tours
        const newTours = [
          a.concat(b.concat(c_)),    // ABC'
          a.concat(b_.concat(c)),    // AB'C
          a.concat(b_.concat(c_)),   // AB'C'
          a_.concat(b.concat(c)),    // A'BC
          a_.concat(b.concat(c_)),   // A'BC'
          a_.concat(b_.concat(c)),   // A'B'C
          a_.concat(b_.concat(c_))   // A'B'C'
        ];

        // If any new tour is better, update tour
        for (let t = 0; t < newTours.length; t++) {
          const thisWeight = getFragWeight(newTours[t]);
          if (thisWeight < best) {
            best = thisWeight;
            TOUR = newTours[t];
            hasChanged = true;
          }
        }

        // If any change was made, return to start. Keep looping until local minimum found
        if (hasChanged) {
          hasChanged = false;
          continue threeOptMainLoop;
        }
      }
    }
  }
}

function nodeSwap() {
  // Get best weight
  let best = getFragWeight(TOUR);
  let swapped = true;
  while (swapped) {
    swapped = false;
    // Loop through every consecutive pair of nodes. Check if swapping would make tour shorter
    for (let curr = 0; curr < TOUR.length; curr++) {
      let next = curr + 1;
      // If next value is out of index, next value is start node
      if (next === TOUR.length) {
        next = 0;
      }
      // Make copy of current tour
      const temp = [...TOUR];

      [temp[curr], temp[next]] = [temp[next], temp[curr]];

      const weight = getFragWeight(temp);
      if (weight < best) {
        best = weight;
        TOUR = temp;
        swapped = true;
      }
    }
  }
}

async function runMFOnAll() {
  for (let i = 0; i < graphs.length; i++) {
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      // If this algorithm has been done on this tour, skip
      if (hasBeenDone(graphs[i].graphs[j].attempts, 'multiFrag')) continue;
      DISTMAT = graphs[i].graphs[j].data;
      await multiFrag();
      TOUR = FRAGS[0];
      graphs[i].graphs[j].attempts.push(
        {
          weight: getFragWeight(TOUR),
          algorithm: 'multiFrag',
        }
      );
    }
  }
}

async function runNNOnAll() {
  for (let i = 0; i < graphs.length; i++) {
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      // If this algorithm has been done on this tour, skip
      if (hasBeenDone(graphs[i].graphs[j].attempts, 'nearestN')) continue;
      DISTMAT = graphs[i].graphs[j].data;
      await nearestNeighbour();
      TOUR = FRAGS[0];
      graphs[i].graphs[j].attempts.push(
        {
          weight: getFragWeight(TOUR),
          algorithm: 'nearestN',
        }
      );
    }
  }
}

async function runDENNOnAll() {
  for (let i = 0; i < graphs.length; i++) {
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      // If this algorithm has been done on this tour, skip
      if (hasBeenDone(graphs[i].graphs[j].attempts, 'doubleENN')) continue;
      DISTMAT = graphs[i].graphs[j].data;
      await doubleEndedNN();
      TOUR = FRAGS[0];
      graphs[i].graphs[j].attempts.push(
        {
          weight: getFragWeight(TOUR),
          algorithm: 'doubleENN',
        }
      );
    }
  }
}

async function runAllOnAll() {
  for (let i = 0; i < graphs.length; i++) {
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      for (let p = 0; p < primaries.length; p++) {
        if (!hasBeenDone(graphs[i].graphs[j].attempts, primaries[p].code)) {
          DISTMAT = graphs[i].graphs[j].data;
          await primaries[p].function();
          TOUR = FRAGS[0];
          graphs[i].graphs[j].attempts.push(
            {
              weight: getFragWeight(TOUR),
              algorithm: primaries[p].code,
            }
          )
        }
        for (let s = 0; s < secondaries.length; s++) {
          const code = `${primaries[p].code}+${secondaries[s].code}`;
          if (hasBeenDone(graphs[i].graphs[j].attempts, code)) continue;
          DISTMAT = graphs[i].graphs[j].data;
          await primaries[p].function();
          TOUR = FRAGS[0];
          await secondaries[s].function();
          graphs[i].graphs[j].attempts.push(
            {
              weight: getFragWeight(TOUR),
              algorithm: code,
            }
          )
        }
      }
    }
  }
}

function hasBeenDone(attempts, alg) {
  const result = attempts.filter(attempt => attempt.algorithm == alg);
  return result.length > 0;
}

document.getElementById('runAlgs').addEventListener('click', async () => {
  document.getElementById('runAlgs').disabled = true;
  // await runMFOnAll();
  // await runNNOnAll();
  // await runDENNOnAll();
  await runAllOnAll();
  sortAllAttempts();
  displayScores();
  document.getElementById('runAlgs').disabled = false;
});

function sortAllAttempts() {
  for (let i = 0; i < graphs.length; i++) {
    for (let j = 0; j < graphs[i].graphs.length; j++) {
      graphs[i].graphs[j].attempts.sort(scoreSort);
    }
  }
}

function scoreSort(a, b) {
  return a.weight - b.weight;
}

document.getElementById('download').addEventListener('click', async () => {
  const json = [JSON.stringify(graphs)];
  const blob = new Blob(json, { type: 'text/plain;charset=utf-8' });
  const link = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = link;
  a.click();
});
