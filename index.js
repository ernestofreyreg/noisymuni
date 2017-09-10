const RTM = require('satori-sdk-js')
const axios = require('axios')
const R = require('ramda')

const rtm = new RTM('wss://rv6bqxdr.api.satori.com', 'cCab773fCDc1c38CbCDE0d243DAA2FEe')

// client receives any PDU and PDU is passed as a parameter
rtm.on('data', function(pdu) {
  if (pdu.action.endsWith('/error')) {
    rtm.restart()
  }
})

function delayedContinuation (fn) {
  setTimeout(() => {
    return fn()
      .then(() => {
        delayedContinuation(fn)
      })
  }, 15000)
}

const parsePrediction = (data, id) => {
  const parsed = {
    id: id,
    type: 'muni-prediction',
    route: R.pick(['id', 'title'])(data.route),
    stop: R.pick(['id', 'lat', 'lon', 'name', 'code'])(data.stop),
    prediction: {
      minutes: data.values[0].minutes,
      vehicleId: data.values[0].vehicleId,
      direction: data.values[0].direction.destinationName,
    }
  }

  return parsed
}

const queryStationA = () => {
  return axios.get('http://www.nextmuni.com/api/pub/v1/agencies/sf-muni/routes/5/stops/4215/predictions' +
    '?coincident=true' +
    '&direction=5____I_F00' +
    // '&destination=4212' +
    '&key=63fd49700228adfa647dcdd4f0319146' +
    `&timestamp=${Date.now()}`, {headers: {Referer: 'http://www.nextmuni.com/'}})
    .then(response => {
      if (response.status !== 200) {
        return
      }

      const parsed = parsePrediction(response.data[0], '720150d32a68c32742f8df5f14f917e3520cbfb9')
      console.log(`BUS STOP Prediction: ${JSON.stringify(parsed)}`)
      rtm.publish("timed-devices", parsed)
      return
    })
    .catch(err => {
      console.log(err)
      return true
    })
}

const queryStationB = () => {
  return axios.get('http://www.nextmuni.com/api/pub/v1/agencies/sf-muni/routes/5/stops/5689/predictions' +
    '?coincident=true' +
    '&direction=5____O_F00' +
    '&destination=4213' +
    '&key=63fd49700228adfa647dcdd4f0319146' +
    `&timestamp=${Date.now()}`, {headers: {Referer: 'http://www.nextmuni.com/'}})
    .then(response => {
      if (response.status !== 200) {
        return
      }

      const parsed = parsePrediction(response.data[0], '57ffbaa8b1f3d775b8b5af2ee97eaf0e36627efc')
      console.log(`BUS STOP Prediction: ${JSON.stringify(parsed)}`)
      rtm.publish("timed-devices", parsed)
      return
    })
    .catch(err => {
      console.log(err)
      return true
    })
}


// client enters 'connected' state
rtm.on("enter-connected", function() {
  delayedContinuation(queryStationA)
  delayedContinuation(queryStationB)
});

rtm.start()
