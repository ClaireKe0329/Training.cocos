// 定義每個 State 可提供的生命週期事件
export interface IStateEvent
{
    // 進入 State 時執行一次
    OnEnter?(): void;

    // State 持續期間每幀執行
    OnUpdate( deltaTime: number ): void;

    // 離開 State 時執行一次
    OnExit?(): void;
}

/**
 * 有限狀態機
 */
export class FSMachine<TState>
{
    // 保存每個 State 對應的生命週期事件
    private _stateEventMap: Map<TState, IStateEvent> = new Map<TState, IStateEvent>();

    // 目前所在的 State
    private _currentState: TState;

    // FSM 是否已正式啟動
    private _isStarted: boolean = false;

    constructor( initState: TState )
    {
        this._currentState = initState;
    }

    // 註冊狀態對應事件
    public RegisterStateEvent( state: TState, event: IStateEvent ): void
    {
        this._stateEventMap.set( state, event );
    }

    // 刪除狀態對應事件
    public RemoveStateEvent( state: TState ): void
    {
        this._stateEventMap.delete( state );
    }

    // 啟動狀態機並執行初始狀態的 OnEnter
    public Start(): void
    {
        if ( this._isStarted )
        {
            return;
        }

        this._isStarted = true;
        this._stateEventMap.get( this._currentState )?.OnEnter?.();
    }

    // 執行目前狀態的 OnUpdate
    public Tick( deltaTime: number ): TState
    {
        if ( !this._isStarted )
        {
            return this._currentState;
        }

        this._stateEventMap.get( this._currentState )?.OnUpdate( deltaTime );
        return this._currentState;
    }

    // 切換狀態並依序執行 OnExit 與 OnEnter
    public ChangeState( state: TState ): void
    {
        if ( this._currentState === state )
        {
            return;
        }

        if ( this._isStarted )
        {
            this._stateEventMap.get( this._currentState )?.OnExit?.();
        }

        this._currentState = state;

        if ( this._isStarted )
        {
            this._stateEventMap.get( this._currentState )?.OnEnter?.();
        }
    }

    // 取得目前狀態
    public get CurrentState(): TState
    {
        return this._currentState;
    }
}
