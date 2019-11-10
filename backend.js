const express = require('express')

const app = express()
const port = 3000

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/write', (req, res) => {
    
    console.log(req.query)
    
    const ical_generator = require('ical-generator');
    var moment = require('moment')
    const cal = ical_generator({name: 'my first iCal'});
    cal.createEvent({
        start: req.query.start == null ? moment(): req.query.start,
        end: req.query.end == null ? moment().add(1, 'hour'): req.query.end,
        summary: req.query.summary == null ? 'Example Event': req.query.summary,
        description: req.query.description == null ? 'It works ;)': req.query.description,
        location: req.query.location == null ? 'my room': req.query.location,
    });
    //cal.domain('sebbo.net');
    //cal.serve(res);
    const fs = require("fs")
    let text = cal.toString()
    fs.writeFile('out.ics', text, (err, data) => {
        if(err) console.log(err);
        else console.log('write end');
    });

    res.send("data")
})


app.get('/read', (req, res) => {
    const ical = require('ical')
    var moment = require('moment')
    var data = ical.parseFile("./schedule3.ics")
    var array = []
    
    for (var k in data) {
        var result = {};

        // When dealing with calendar recurrences, you need a range of dates to query against,
        // because otherwise you can get an infinite number of calendar events.
        var rangeStart = moment("2017-01-01")
        var rangeEnd = moment("2017-12-31")
    
    
        var event = data[k]
        if (event.type === 'VEVENT') {
    
            var title = event.summary;
            var startDate = moment(event.start);
            var endDate = moment(event.end);
    
            // Calculate the duration of the event for use with recurring events.
            var duration = parseInt(endDate.format("x")) - parseInt(startDate.format("x"));
    
            // Simple case - no recurrences, just print out the calendar event.
            if (typeof event.rrule === 'undefined')
            {
                console.log('title:' + title)
                console.log('startDate:' + startDate.format('MMMM Do YYYY, h:mm:ss a'))
                console.log('endDate:' + endDate.format('MMMM Do YYYY, h:mm:ss a'))
                console.log('duration:' + moment.duration(duration).humanize())
                console.log('location:' + event.location)
                console.log()

                result['title'] = title;
                result['start'] = startDate.format('MMMM Do YYYY, h:mm:ss a')
                result['end'] = endDate.format('MMMM Do YYYY, h:mm:ss a')
                result['location'] = event.location
            }
    
            // Complicated case - if an RRULE exists, handle multiple recurrences of the event.
            else if (typeof event.rrule !== 'undefined')
            {
                // For recurring events, get the set of event start dates that fall within the range
                // of dates we're looking for.
                var dates = event.rrule.between(
                  rangeStart.toDate(),
                  rangeEnd.toDate(),
                  true,
                  function(date, i) {return true;}
                )
    
                // The "dates" array contains the set of dates within our desired date range range that are valid
                // for the recurrence rule.  *However*, it's possible for us to have a specific recurrence that
                // had its date changed from outside the range to inside the range.  One way to handle this is
                // to add *all* recurrence override entries into the set of dates that we check, and then later
                // filter out any recurrences that don't actually belong within our range.
                if (event.recurrences != undefined)
                {
                    for (var r in event.recurrences)
                    {
                        // Only add dates that weren't already in the range we added from the rrule so that 
                        // we don't double-add those events.
                        if (moment(new Date(r)).isBetween(rangeStart, rangeEnd) != true)
                        {
                            dates.push(new Date(r));
                        }
                    }
                }
    
                // Loop through the set of date entries to see which recurrences should be printed.
                for(var i in dates) {
    
                    var date = dates[i];
                    var curEvent = event;
                    var showRecurrence = true;
                    var curDuration = duration;
    
                    startDate = moment(date);
    
                    // Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
                    var dateLookupKey = date.toISOString().substring(0, 10);
    
                    // For each date that we're checking, it's possible that there is a recurrence override for that one day.
                    if ((curEvent.recurrences != undefined) && (curEvent.recurrences[dateLookupKey] != undefined))
                    {
                        // We found an override, so for this recurrence, use a potentially different title, start date, and duration.
                        curEvent = curEvent.recurrences[dateLookupKey];
                        startDate = moment(curEvent.start);
                        curDuration = parseInt(moment(curEvent.end).format("x")) - parseInt(startDate.format("x"));
                    }
                    // If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
                    else if ((curEvent.exdate != undefined) && (curEvent.exdate[dateLookupKey] != undefined))
                    {
                        // This date is an exception date, which means we should skip it in the recurrence pattern.
                        showRecurrence = false;
                    }
    
                    // Set the the title and the end date from either the regular event or the recurrence override.
                    var recurrenceTitle = curEvent.summary;
                    endDate = moment(parseInt(startDate.format("x")) + curDuration, 'x');
    
                    // If this recurrence ends before the start of the date range, or starts after the end of the date range, 
                    // don't process it.
                    if (endDate.isBefore(rangeStart) || startDate.isAfter(rangeEnd)) {
                        showRecurrence = false;
                    }
    
                    if (showRecurrence === true) {
    
                        console.log('title:' + recurrenceTitle);
                        console.log('startDate:' + startDate.format('MMMM Do YYYY, h:mm:ss a'));
                        console.log('endDate:' + endDate.format('MMMM Do YYYY, h:mm:ss a'));
                        console.log('duration:' + moment.duration(curDuration).humanize());
                        console.log();

                        result['title'] = title;
                        result['start'] = startDate.format('MMMM Do YYYY, h:mm:ss a')
                        result['end'] = endDate.format('MMMM Do YYYY, h:mm:ss a')
                        result['location'] = event.location
                    }
    
                }
            }
            
            array.push(result)
        }
    }

    res.send(array)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))