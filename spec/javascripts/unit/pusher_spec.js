describe("Pusher", function() {
  var _isReady, _instances;
  var strategy, manager, pusher;

  beforeEach(function() {
    _instances = Pusher.instances;
    _isReady = Pusher.isReady;
    Pusher.isReady = false;
    Pusher.instances = [];

    spyOn(Pusher.WSTransport, "isSupported").andReturn(true);
    spyOn(Pusher.FlashTransport, "isSupported").andReturn(false);

    jasmine.Clock.useMock();

    strategy = Pusher.Mocks.getStrategy(true);
    manager = Pusher.Mocks.getConnectionManager();

    spyOn(Pusher.StrategyBuilder, "build").andReturn(strategy);
    spyOn(Pusher, "ConnectionManager").andReturn(strategy);
    spyOn(Pusher.JSONPRequest, "send");

    pusher = new Pusher("foo");
  });

  afterEach(function() {
    Pusher.instances = _instances;
    Pusher.isReady = _isReady;
  });

  describe("app key validation", function() {
    it("should allow a hex key", function() {
      spyOn(Pusher, "warn");
      var pusher = new Pusher("1234567890abcdef");
      expect(Pusher.warn).not.toHaveBeenCalled();
    });

    it("should warn on a null key", function() {
      spyOn(Pusher, "warn");
      var pusher = new Pusher(null);
      expect(Pusher.warn).toHaveBeenCalled();
    });

    it("should warn on an undefined key", function() {
      spyOn(Pusher, "warn");
      var pusher = new Pusher();
      expect(Pusher.warn).toHaveBeenCalled();
    });
  });

  describe("on ready", function() {
    it("should start a connection attempt", function() {
      var pusher = new Pusher();
      spyOn(pusher, "connect");

      expect(pusher.connect).not.toHaveBeenCalled();
      Pusher.ready();
      expect(pusher.connect).toHaveBeenCalled();
    });
  });

  describe("on connection manager construction", function() {
    it("should pass the key", function() {
      expect(Pusher.ConnectionManager)
        .toHaveBeenCalledWith("foo", jasmine.any(Object));
    });

    it("should pass default timeouts", function() {
      var options = Pusher.ConnectionManager.calls[0].args[1];

      expect(options.activityTimeout).toEqual(Pusher.activity_timeout);
      expect(options.pongTimeout).toEqual(Pusher.pong_timeout);
      expect(options.unavailableTimeout).toEqual(Pusher.unavailable_timeout);
    });

    it("should pass user-specified timeouts", function() {
      var pusher = new Pusher("foo", {
        activityTimeout: 123,
        pongTimeout: 456,
        unavailableTimeout: 789
      });
      // first call is from beforeEach
      var options = Pusher.ConnectionManager.calls[1].args[1];

      expect(options.activityTimeout).toEqual(123);
      expect(options.pongTimeout).toEqual(456);
      expect(options.unavailableTimeout).toEqual(789);
    });

    it("should respect the 'encrypted' option", function() {
      var pusher = new Pusher("foo", { encrypted: true });

      // Tests are run via HTTP, so default should be not encrypted
      expect(Pusher.ConnectionManager.calls[0].args[1].encrypted)
        .toEqual(false);
      expect(Pusher.ConnectionManager.calls[1].args[1].encrypted)
        .toEqual(true);
    });
  });

  describe("on connect", function() {
    var managerOptions;

    beforeEach(function() {
      pusher.connect();
      managerOptions = Pusher.ConnectionManager.calls[0].args[1];
    });

    describe("with getStrategy function", function() {
      it("should construct a strategy instance", function() {
        var strategy = managerOptions.getStrategy();
        expect(strategy.isSupported).toEqual(jasmine.any(Function));
        expect(strategy.connect).toEqual(jasmine.any(Function));
      });

      it("should pass per-connection strategy options", function() {
        pusher = new Pusher("foo", { encrypted: true });
        pusher.connect();

        managerOptions = Pusher.ConnectionManager.calls[1].args[1];
        managerOptions.getStrategy();

        expect(Pusher.StrategyBuilder.build)
          .toHaveBeenCalledWith(
            Pusher.Util.extend({}, Pusher.defaultStrategy, { encrypted: true })
          );
      });

      it("should pass options to the strategy builder", function() {
        managerOptions.getStrategy({ encrypted: true });
        expect(Pusher.StrategyBuilder.build)
          .toHaveBeenCalledWith(
            Pusher.Util.extend({}, Pusher.defaultStrategy, { encrypted: true })
          );
      });
    });

    describe("with getTimeline function", function() {
      beforeEach(function() {
        spyOn(Pusher.Util, "getClientFeatures").andReturn(["foo", "bar"]);
      });

      it("should create a timeline with the correct key", function() {
        expect(managerOptions.getTimeline().key).toEqual("foo");
      });

      it("should create a timeline with a session id", function() {
        expect(managerOptions.getTimeline().session)
          .toEqual(jasmine.any(Number));
      });

      it("should pass a feature list to the timeline", function() {
        expect(managerOptions.getTimeline().options.features)
          .toEqual(["foo", "bar"]);
      });

      it("should pass per-connection timeline params", function() {
        pusher = new Pusher("foo", { timelineParams: { horse: true } });
        pusher.connect();
        managerOptions = Pusher.ConnectionManager.calls[1].args[1];

        expect(managerOptions.getTimeline().options.params)
          .toEqual({ horse: true });
      });
    });

    describe("with getTimelineSender function", function() {
      var timeline;

      beforeEach(function() {
        timeline = Pusher.Mocks.getTimeline();
      });

      it("should create a sender with correct host and path", function() {
        var sender = managerOptions.getTimelineSender(timeline, {}, manager);
        expect(sender.options.host).toEqual(Pusher.stats_host);
        expect(sender.options.path).toEqual("/timeline");
      });

      it("should create an unencrypted sender by default", function() {
        var sender = managerOptions.getTimelineSender(timeline, {}, manager);
        expect(sender.isEncrypted()).toBe(false);
      });

      it("should create an encrypted sender for encrypted connections", function() {
        pusher = new Pusher("foo", { encrypted: true });
        pusher.connect();
        managerOptions = Pusher.ConnectionManager.calls[1].args[1];

        var sender = managerOptions.getTimelineSender(timeline, {}, manager);
        expect(sender.isEncrypted()).toBe(true);
      });

      it("should create an encrypted sender if specified in options", function() {
        var sender = managerOptions.getTimelineSender(
          timeline,
          { encrypted: true },
          manager
        );
        expect(sender.isEncrypted()).toBe(true);
      });

      it("should send timeline on manager's connect event", function() {
        var sender = managerOptions.getTimelineSender(timeline, {}, manager);
        spyOn(sender, "send");

        expect(sender.send).not.toHaveBeenCalled();
        manager.emit("connected");
        expect(sender.send).toHaveBeenCalled();
      });

      it("should send timeline every minute", function() {
        var sender = managerOptions.getTimelineSender(timeline, {}, manager);
        spyOn(sender, "send");

        jasmine.Clock.tick(59999);
        expect(sender.send.calls.length).toEqual(0);
        jasmine.Clock.tick(1);
        expect(sender.send.calls.length).toEqual(1);
        jasmine.Clock.tick(60000);
        expect(sender.send.calls.length).toEqual(2);
      });
    });
  });
});
