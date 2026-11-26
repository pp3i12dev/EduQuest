import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rankStudents } from '../src/utils/leaderboardRanking.js';
const students = [{id:1,name:'A'}, {id:2,name:'B'}, {id:3,name:'C'}];
const activities = [{id:5},{id:8}];
const attempts = [
  {studentId:1,activityId:5,score:40}, {studentId:1,activityId:5,score:90},
  {studentId:2,activityId:5,score:100}, {studentId:2,activityId:8,score:70},
];
test('el ranking considera la mejor nota por actividad, no las repeticiones', () => {
  const rows=rankStudents({students,activities,attempts});
  assert.equal(rows.find(x=>x.studentId===1).score,45);
  assert.equal(rows.find(x=>x.studentId===2).score,85);
  assert.equal(rows[0].studentId,2);
  assert.equal(rows.find(x=>x.studentId===3).position,null);
});
test('ranking individual de la actividad sin contar las otras',()=>{
  const rows=rankStudents({students,activities,attempts,activityId:5});
  assert.equal(rows[0].studentId,2);
  assert.equal(rows[0].score,100);
  assert.equal(rows[1].score,90);
});
test('empates genuinos comparten puesto',()=>{
  const rows=rankStudents({students:[{id:1,name:'A'},{id:2,name:'B'}],activities:[{id:5}],
    attempts:[{studentId:1,activityId:5,score:100},{studentId:2,activityId:5,score:100}]});
  assert.equal(rows[0].position,1);
  assert.equal(rows[1].position,1);
});
