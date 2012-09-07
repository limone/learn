// Hack some stuff into the String object
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.lastIndexOf(str, 0) === 0;
  }
}

window.learn = {};

// Show some messages
function displayMessage(msg) {
  $("#messages").html(msg);
}

var socket = io.connect(document.location.href);

$(document).ready(function () {
  $('#terminal-entry').show();
  $('#entry').focus();
});

$(document).on('click', '.nextPage', function(event) {
  console.log("next page");
});

$(document).on('click', '.prevPage', function(event) {
  console.log("previous page");
});

$('#entry').on('keypress', function (event) {
  if (event.which == 13) {
    event.preventDefault();
    var message = new String($('#entry').val());

    if (message.toLowerCase() === "help") {
      $('#output-data').html("<h1>help</h1><p><i class='icon-question-sign icon-white'></i> Currently available functionality: </p><p><blockquote>\\l - list tables<br/>\\d &lt;table name&gt; - describe a table<br/>* any SQL query you can think of<br/><br/>reconnect - reconnect to the DB if something went heinously wrong</blockquote></p>");
    } else if (message.toLowerCase() === "reconnect") {
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

    console.log("Has prev: " + data.hasPrev + " -- Has more: " + data.hasMore);

    // paging helper
    var paging = "<div class='row-fluid'>";
    if (data.hasPrev) {
      paging += "<div><a class='prevPage'>Previous Page</a></div>";
    }

    if (data.hasMore) {
      paging += "<div class='pull-right'><a class='nextPage'>Next Page</a></div>";
    }
    paging += "</div>";

    var rows = paging;
    $.each(data.result, function (idx, row) {
      if (idx > 100) {
        // fow now, break out after a bunch of rows
        return false;
      }

      rows += "<div class='row-fluid'>";
      $.each(row, function (cellName, cellValue) {
        rows += "<div class='span1'>";
        if (idx == 0) {
          rows +="<strong>" + cellName + "</strong>";
        } else {
          rows += cellValue;
        }
        rows += "</div>";
      });
      rows += "</div>";
    });

    rows += paging;

    $("#output-data").html("<h1>results</h1>" + rows);
  } else {
    $("#output-data").html("<h1>error</h1>" + "<p><i class='icon-warning-sign icon-white'></i> " + data + "</p>");
  }

  displayMessage("");
  $('#entry').prop('disabled', false);
});