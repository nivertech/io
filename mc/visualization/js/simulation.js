// Run the simulation nsteps at a time, relinquishing control every nsteps
// so other updates can occur during the simulation.
// simulation(state, initialize_callback, update_callback, finished_callback)
var simulation = (function() {
  
  var nmatches = 10000;
  var nstep = 500;

  // HELPER FUNCTIONS
  // Pick a coordinate in the field (not right on the edge, or near it).
  function gen_x(third) { 
    var w = 1/3;
    return Math.random()*w + third*w;
  }
  // Pick a random y-coordinate
  function gen_y() {
    return Math.random();
  }

  // Shuffle an array
  function shuffle(o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  // GAME MECHANICS
  function is_forward(player) { return player.position == 'forward'; }
  function is_midfielder(player) { return player.position == 'midfielder'; }
  function is_defender(player) { return player.position == 'defender'; }
  function is_goalkeeper(player) { return player.position == 'goalkeeper'; }

  // New game
  // Updates x, y, third
  function clear(state) {
    reset(state);
    state.match++;
    if(!state['total_step']) {state['total_step'] = 0; }
    state.total_steps += state.step;
    state.step = 0;
    state.attempts = [0, 0];
    state.goals = [0, 0];
    state.fouls = [0, 0];
    state.red_cards = [0, 0];
    state.yellow_cards = [0, 0];
  }
 
  // Reset players to initial random position, change ownership
  // Updates x, y, third
  function reset(state) {
    state.controlling_team = (state.controlling_team == 1) ? 0 : 1;
    for(var t = 0; t < state.team.length; t++) {
      for(var i = 0; i < state.team[t].length; i++) {
        // Assign locations
        state.team[t].third = (Math.random() < 0.5 ? 0 : 1);
        if (is_defender(state.team[t][i])) { state.team[t].third = 1; }
        state.team[t][i].x = gen_x(state.team[t][i].third);
        state.team[t][i].y = gen_y();
        // Assign an owner
        if (state.controlling_team == t && is_forward(state.team[t][i])) { state.controlling_player = i; }
      }
    }
  }

  // Move players not in control of the ball to adjacent locations
  // Updates x, y, third
  function move(state) {
    for(var t = 0; t < state.team.length; t++) {
      for(var i = 0; i < state.team[t].length; i++) {
        // Dont move the controlling player
        // if(t == state.controlling_team && i == state.controlling_player) { continue; }
        // Randomly move players to a third based on the PDF
        var n = Math.random();
        for(var k = state.team[t][i].move.length-1; k >= 0 ; k--) {
	  if(n >= state.team[t][i].move[k] && (Math.max(k, state.team[t][i].third) - Math.min(k, state.team[t][i].third)) < 2) {
            // Assign new locations
            state.team[t][i].third = k;
            state.team[t][i].x = gen_x(k);
            state.team[t][i].y = gen_y();
            break;
          }
        }
      }
    }
  }

  // Pass control to a player on the same team
  // Updates x, y, third
  function pass(state, third) {
    var candidate = [];
    var t = state.controlling_team; 
    for(var i = 0; i < state.team[t].length; i++) {
      if(i == state.controlling_player || state.team[t][i].third != third) { continue; }
      candidate.push(i);
    }
    shuffle(candidate);
    if(candidate.length > 0) {
      state.controlling_player = candidate[0];
    }
  }

  // Pass control to a player on the opposite team
  // Updates x, y, third
  function pass_attempt(state, third) {
    var candidate = [];
    var t = (state.controlling_team == 1) ? 0 : 1; 
    for(var i = 0; i < state.team[t].length; i++) {
      if(i == state.controlling_player || state.team[t][i].third != third) { continue; }
      candidate.push(i);
    }
    shuffle(candidate);
    if(candidate.length > 0) {
      state.controlling_team = t;
      state.controlling_player = candidate[0];
    }
  }


  var transitions = [
    foul,
    red_card,
    yellow_card,
    pass_0,
    pass_1,
    pass_2,
    pass_attempt_0,
    pass_attempt_1,
    pass_attempt_2,
    own_goal,
    regular_goal,
    regular_attempt,
    corner_kick_goal,
    corner_kick_attempt,
    penalty_kick_goal,
    penalty_kick_attempt,
    free_kick_goal,
    free_kick_attempt,
    throwin_goal,
    throwin_attempt,
  ];
 
  function foul(state) {
    state.fouls[state.controlling_team]++;
    reset(state);
  }
  
  function red_card(state) {
    state.red_cards[state.controlling_team]++;
  }
  
  function yellow_card(state) {
    state.yellow_cards[state.controlling_team]++;
  }
   
  function pass_0(state) {
    pass(state, 0);
  }
  
  function pass_1(state) {
    pass(state, 1);
  }
  
  function pass_2(state) {
    pass(state, 2);
  }
  
  function pass_attempt_0(state) {
    pass_attempt(state, 0);
  }
  
  function pass_attempt_1(state) {
    pass_attempt(state, 1);
  }
  
  function pass_attempt_2(state) {
    pass_attempt(state, 2);
  }
  
  function own_goal(state) {
    state.goals[((state.controlling_team == 1) ? 0 : 1)]++;
    reset(state);
  }
  
  function regular_goal(state) {
    state.goals[state.controlling_team]++;
    state.attempts[state.controlling_team]++;
    reset(state);
  }
  
  function regular_attempt(state) {
    state.attempts[state.controlling_team]++;
  }
  
  function corner_kick_goal(state) {
    state.goals[state.controlling_team]++;
    state.attempts[state.controlling_team]++;
    reset(state);
  }
  
  function corner_kick_attempt(state) {
    state.attempts[state.controlling_team]++;
  }
  
  function penalty_kick_goal(state) {
    state.goals[state.controlling_team]++;
    state.attempts[state.controlling_team]++;
    reset(state);
  }
  
  function penalty_kick_attempt(state) {
    state.attempts[state.controlling_team]++;
  }
  
  function free_kick_goal(state) {
    state.goals[state.controlling_team]++;
    state.attempts[state.controlling_team]++;
    reset(state);
  }
  
  function free_kick_attempt(state) {
    state.attempts[state.controlling_team]++;
  }
  
  function throwin_goal(state) {
    state.goals[state.controlling_team]++;
    state.attempts[state.controlling_team]++;
    reset(state);
  }
  
  function throwin_attempt(state) {
    state.attempts[state.controlling_team]++;
  }

  function gen_event_max() { 
    return 250 + (Math.random()*500); /* soccer.game_length range of avg # of events */ 
  }

  // Return a function that can be used iteratively run the state machine.
  return function(state, initialize, updated, finished) {
 
    if(!state.initialized) {
      clear(state);
      state.initialized = true;
      initialize(state);
    }
  
    // Simulate one step in the game
    function simulate_step(state) {
      // Move players
      move(state);
      // Select a PDF
      var p = state.team[state.controlling_team][state.controlling_player].probability;
      var third = state.team[state.controlling_team][state.controlling_player].third;
      if(third <= p.length) {
        // Choose an action
        var n = Math.random();
        for(var k = p[third].length - 1; k >= 0; k--) {
          if(n > p[third][k]) {
            // Apply the action to the state
            transitions[k](state);
            break;
          }
        }
      }
      state.step++;
    }

    state.startedAt = new Date().getTime();

    var event_max = gen_event_max();

    function step() {

      // Take n steps
      for(var i = 0; i < nstep; i++) {
	simulate_step(state);
	// Reset match if enough steps have happened
        if(state.step > event_max) {
          state.history.push(state.goals);
          event_max = gen_event_max();
          clear(state);
        }
      }

      // Invoke the callback
      updated(state);

      // Schedule next task
      if(state.match < nmatches) {
        setTimeout(step, 0);
      } else {
        finished(state);
      }
  
    }
    setTimeout(step, 0);

  };

}());
