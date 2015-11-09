var config = require('./config');
var colors = require('colors');


var GeolocatedUser = function (displayname, socket, latitude, longitude) {
    // Properties
    var self = this;
    self.Socket = socket;
    self.DisplayName = displayname;
    self.Latitude = latitude;
    self.Longitude = longitude;
}

var Repository = function () {
    // Properties
    var self = this;
    self.NextUserID = 0;
    self.Users = [];
    // Functions
    self.FindUserBySocket = function (socket) {
        for (var i = 0; i < self.Users.length; i++) {
            var User = self.Users[i];
            if (User.Socket == socket)
                return User;
        }
        return null;
    };
    
    self.RemoveUser = function (User) {
        console.log("[" + "Log".green + "] Removing user " + User.UserID);
        var index = self.Users.indexOf(User);
        if (index > -1)
            self.Users.splice(index, 1);
    }

    self.RegisterUser = function (DisplayName, Socket, Latitude, Longitude) {
        console.log("[" + "Loc".green + "] Registering user " + DisplayName);
        var User = self.FindUserBySocket(Socket);
        if (User != null) {
            User.DisplayName = DisplayName;
            User.Latitude = Latitude;
            User.Longitude = Longitude;
        } else {
            User = new GeolocatedUser(DisplayName, Socket, Latitude, Longitude);
            User.UserID = self.NextUserID;
            self.NextUserID++;
            self.Users.push(User);
            Socket.on('disconnect', function () {
                self.RemoveUser(User);
            });
        }
    };
    
    self.toRadians = function (x) {
        return x * Math.PI / 180;
    }
    
    self.toDegrees = function (x) {
        return x * 180 / Math.PI;
    }
    
    self.GetUser = function (UserID) {
        for (var i = 0; i < self.Users.length; i++) {
            var User = self.Users[i];
            if (User.UserID == UserID)
                return User;
        }
        return null;
    }
    
    self.FindUsersNear = function (Latitude, Longitude, Distance) {
        var Users = [];
        for (var i = 0; i < self.Users.length; i++) {
            var User = self.Users[i];
            var UserDist = self.DistanceFrom(User, Latitude, Longitude);
            console.log("[" + "Loc".green + "] User distance: " + UserDist);
            if (UserDist <= Distance)
                Users.push(User);
        }
        return Users;
    };
    
    self.DistanceFrom = function (User, Latitude, Longitude) {
        return self.LocationDistance(User.Latitude, User.Longitude, Latitude, Longitude);
    }
    
    self.LocationDistance = function(Lat1, Lon1, Lat2, Lon2) {
        var φ1 = self.toRadians(Lat1), φ2 = self.toRadians(Lat2), Δλ = self.toRadians(Lon1 - Lon2), R = 6371000;
        var d = Math.acos(Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)) * R;
        return d;
    }

    // Calculates the distance between two users.
    self.UserDistance = function (User1, User2) {
        return self.LocationDistance(User1.Latitude, User1.Longitude, User2.Latitude, User2.Longitude);
    };
}

module.exports = Repository;