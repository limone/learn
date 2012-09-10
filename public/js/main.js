window.learn = {
  currentPage: 0,
  currentQuery:null,
  queries:     [],
  queryIdx:    0
};

// Show some messages
function displayMessage(msg) {
  $("#messages").html(msg);
}

var socket = io.connect(document.location.href);

$(document).ready(function () {
  $('#terminal-entry').show();
  $('#entry').focus();
});

$(document).on('click', '.nextPage', function (event) {
  $('#entry').prop('disabled', true);
  displayMessage("Hold up - firing off that query for you!");
  socket.emit('sql', {'query':window.learn.currentQuery, 'offset':100 * window.learn.currentPage});
});

$(document).on('click', '.prevPage', function (event) {
  $('#entry').prop('disabled', true);
  displayMessage("Hold up - firing off that query for you!");
  socket.emit('sql', {'query':window.learn.currentQuery, 'offset':100 * window.learn.currentPage});
});

$('#entry').on('keydown', function (event) {
  if (event.which == 13) {
    event.preventDefault();
    var message = new String($('#entry').val());

    // All messages get saved to the history, whether they are right or not
    window.learn.currentPage = 0;
    if (window.learn.queries.last() != message) {
      window.learn.queries.push(message);
      window.learn.queryIdx++;
    }

    if (message.toLowerCase().startsWith("help")) {
      $('#output-data').html("<h1>help</h1><p><i class='icon-question-sign icon-white'></i> Currently available functionality: </p><p><blockquote>\\l - list tables<br/>\\d &lt;table name&gt; - describe a table<br/>* any SQL query you can think of<br/><br/>reconnect - reconnect to the DB if something went heinously wrong</blockquote></p>");
    } else if (message.toLowerCase().startsWith("reconnect")) {
      $('#entry').prop('disabled', true);
      displayMessage("Hold up - attempting to (re)connect to the database.");
      socket.emit('reconnect', null);
    } else if (message.startsWith("\\d")) {
      $('#entry').prop('disabled', true);
      displayMessage("Hold up - attempting to gather data about the specified table.");
      socket.emit('describe', message);
    } else if (message.startsWith("\\l")) {
      $('#entry').prop('disabled', true);
      displayMessage("Hold up - listing the available tables in the current database.");
      socket.emit('list');
    } else if (message.toLowerCase() === 'clear') {
      $('#output-data').html('');
    } else {
      $('#entry').prop('disabled', true);
      displayMessage("Hold up - firing off that query for you!");
      socket.emit('sql', {'query':message});
    }

    return false;
  } else if (event.which == 38 || event.keyCode == 38) {
    // clicked the up arrow
    if (window.learn.queryIdx > 0) {
      window.learn.queryIdx--;
    }

    if (window.learn.queries.length > window.learn.queryIdx) {
      var historyEntry = window.learn.queries[window.learn.queryIdx];
      $('#entry').val(window.learn.queries[window.learn.queryIdx]);
    }

    event.preventDefault();
    return false;
  } else if (event.which == 40 || event.keyCode == 40) {
    // clicked the down arrow
    var historyEntry = '';
    if (window.learn.queryIdx < window.learn.queries.length) {
      window.learn.queryIdx++;
      historyEntry = window.learn.queries[window.learn.queryIdx];
    }
    $('#entry').val(historyEntry);

    event.preventDefault();
    return false;
  }
});

socket.on('output', function (data, is_err) {
  if (!is_err) {
    if (data.message && data.header) {
      $("#output-data").html("<h1>" + data.header + "</h1><div>" + data.message + "</div>");
      displayMessage("");
      $('#entry').prop('disabled', false);
      return;
    }

    if (data.result && data.result.length === 0) {
      $("#output-data").html("<h1>results</h1><div><i class='icon-exclamation-sign icon-white'></i> No results for the provided query.</div>");
      displayMessage("");
      $('#entry').prop('disabled', false);
      return;
    }

    window.learn.currentQuery = data.query;

    // paging helper
    var paging = "<div class='row-fluid'>";
    if (data.hasPrev) {
      paging += "<div><a class='prevPage'>Previous Page</a></div>";
    }

    if (data.hasMore) {
      paging += "<div class='pull-right'><a class='nextPage'>Next Page</a></div>";
    }
    paging += "</div>";

    var header = "<div class='row-fluid'>";

    var rows = paging;
    $.each(data.result, function (idx, row) {
      rows += "<div class='row-fluid'>";

      $.each(row, function (cellName, cellValue) {
        if (idx == 0) {
          header += "<div class='span1'><strong>" + cellName + "</strong></div>";
        }
        rows += "<div class='span1'>" + cellValue + "</div>";
      });
      rows += "</div>";
    });

    header += "</div>";
    rows += paging;

    $("#output-data").html("<h1>results</h1>" + header + rows);
  } else {
    $("#output-data").html("<h1>error</h1>" + "<p><i class='icon-warning-sign icon-white'></i> " + data + "</p>");
  }

  displayMessage("");
  $('#entry').prop('disabled', false);
});