export interface IStateEvent
{
    OnEnter?(): void;
    OnUpdate( deltaTime: number ): void;
    OnExit?(): void;
}

/**
 * 有限狀態機
 */
export class FSMachine<TState>
{
    private _stateEventMap: Map<TState, IStateEvent> = new Map<TState, IStateEvent>();

    private _currentState: TState;

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

    // 更新目前狀態
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
